import { Component, OnInit, Input, ElementRef, Inject, LOCALE_ID, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import * as d3 from 'd3';

/**
 * definition of external used chart item
 */
export interface SegmentedBarChartData {
  /** caption for segment entry */
  caption: string;
  /** optional color for segment entry */
  color?: string;
  /** at last segment level value must be specified */
  value?: number;
  /** child segments for current entry */
  segments?: SegmentedBarChartData[];
};

/**
 * definition of internal used chart item
 */
export interface InternalSegmentedBarChartData extends SegmentedBarChartData {
  /** reference to origin chart item */
  origin: SegmentedBarChartData;
  /** overloaded segments for current entry with origin references */
  segments: InternalSegmentedBarChartData[];
}

/**
 * definition of segments
 */
export interface SegmentedBarChartSegment  {
  /** reference to chart item */
  data: InternalSegmentedBarChartData;
  /** reference to parent chart item, null at first level */
  parent: InternalSegmentedBarChartData | null;
  /** value for chart item */
  value: number;
  /** color for chart item */
  color: string;
  /** rect definition for chart item bar / segment */
  rect: {
    /** x coordinate for chart item bar */
    x: number,
    /** y corrdinate for chart item bar */
    y: number,
    /** width for chart item bar */
    width: number,
    /** height for chart item bar */
    height: number,
    /** opacity for chart item bar */
    opacity: number
  },
  /** text definition for chart item text */
  text: {
    /** x coordinate for chart item text */
    x: number,
    /** y coordinate for chart item text */
    y: number,
    /** opacity for chart item text */
    opacity: number
  }
}

/**
 * describes one x axis tick element
*/
export interface SegmentedBarChartTick {
  /** value for tick */
  value: number;
  /** decimal places for tick */
  decimals: number;
  /** x coordinate for tick */
  x: number;
  /** opacity for tick */
  opacity: number;
}

/**
 * describes one breadcrumb element
 */
export interface SegmentedBarChartBreadcrumb {
  /** reference to data */
  data: InternalSegmentedBarChartData, 
  /** x coordinate for breadcrumb text */
  x: number, 
  /** y coordinate for breadcrumb text */
  y: number, 
  /** color for breadcrumb text */
  color: string, 
  /** opacity for breadcrumb text */
  opacity: number
}

@Component({
  selector: 'oc-segmented-bar-chart',
  templateUrl: './segmented-bar-chart.component.html',
  styleUrls: ['./segmented-bar-chart.component.css']
})
export class SegmentedBarChartComponent implements OnInit, OnChanges {
  /** bar chart data */
  @Input() data: SegmentedBarChartData[] = [];
  /** bar chart width */
  @Input() width: number = 800;
  /** duration in milliseconds for one animation cycle */
  @Input() duration: number = 2500;
  /** fired when user clicks on a chart entry */
  @Output() chartClick: EventEmitter<SegmentedBarChartData> = new EventEmitter();
  /** fired when user hovers a chart entry */
  @Output() chartHover: EventEmitter<SegmentedBarChartData> = new EventEmitter();
  /** copy of chart data for internal use only */
  public chartData: InternalSegmentedBarChartData[] = [];
  /** bar chart height will be calculated automatically */
  public height: number = 0;
  /** reference to svg element */
  protected svg: SVGElement;
  /** height of one bar */
  public barHeight: number = 20;
  /** spacing between two bars */
  public barSpacing: number = 5;
  /** top offset of bar area */
  public barOffsetTop: number = 40;
  /** left offset of bar area (calculated automatically) */
  public barOffsetLeft: number;
  /** right offset of bar area */
  public barOffsetRight: number = 0;
  /** currently visible segments and bars */
  public segments: SegmentedBarChartSegment[] = [];
  /** currently active parent segment, only filled if nested child is selected */
  public activeSegment: InternalSegmentedBarChartData = null;
  /** tick definition for x axis */
  public ticks: SegmentedBarChartTick[] = [];
  /** breadcrumb entries */
  public breadcrumbs: SegmentedBarChartBreadcrumb[] = [];
  /** current factor for x axis */
  protected factor: number = 1;
  /** current decimals for x axis */
  protected decimals: number = 0;
  /** true when animation is still active to prevent user actions */
  protected animationActive: boolean = false;
  /** stores whether chart component has been initialized */
  protected initialized = false;
  /** callback reference, which should be executed when current animation has finished */
  protected animationFinshed: () => void;

  constructor(
    private element: ElementRef,
    @Inject(LOCALE_ID) private locale: string
  ) { }

  ngOnInit() {
    // get reference to svg element
    this.svg = (this.element.nativeElement as HTMLElement).querySelector('svg');
    // get reference to tooltip element
    this.tooltip = this.element.nativeElement.querySelector('div.segmented-bar-chart-tooltip') as HTMLDivElement;
    // mark chart as initialized
    this.initialized = true;
    // react to chart data changes
    this.chartDataChanged();
  };

  ngOnChanges(changes: SimpleChanges): void {
    if(!this.initialized) return ;
    // if data has changed: hook data change animation
    if(changes.data){ this.chartDataChanged(); }
    // if chart width has changed: hook width change animation
    if(changes.width){ this.hookWidthChangedAnimation(); }
  }

  /**
   * Simulates a click on a html/svg element to activate angulars change detection for animations.
   * If an animation is started without user interaction (event), angular doesn't renders the 
   * presentation. Possible alternative could be to call tick-method each time during animation 
   * data changes.
   * Todo: move to common library?
   * @param element 
   */
  protected simulateClick(element: Element): void {
    // create new mouse event
    const event = document.createEvent('MouseEvent');
    // initialize it as a click event
    event.initEvent('click', true, true);
    // fire event on target element
    element.dispatchEvent(event);
  };

  /**
   * Generates a random color for a chart item.
   * Todo: move to common library?
   */
  protected generateRandomColor(): string {
    const hue2rgb = (p: number, q: number, t: number) => {
      if(t < 0) t += 1; 
      if(t > 1) t -= 1; 
      if(t < 1/6) return p + (q - p) * 6 * t;
      if(t < 1/2) return q;
      if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const h = (Math.random() + 0.618033988749895) % 1;
    const s = .5;
    const l = .6;
    let q = l + s - l * s;
    let p = 2 * l - q;
    const r = hue2rgb(p, q, h + 1/3);
    const g = hue2rgb(p, q, h);
    const b = hue2rgb(p, q, h - 1/3);
    const color = '#' 
                + Math.round(r * 255).toString(16)
                + Math.round(g * 255).toString(16)
                + Math.round(b * 255).toString(16);
    return color;
  };

  /**
   * Search parent item for given item, returns null if item is at top level or no parent is found.
   * @param item 
   */
  protected getParent(item: InternalSegmentedBarChartData): InternalSegmentedBarChartData | null {
    // inline function for recursive search
    const r = (items: InternalSegmentedBarChartData[], parent: InternalSegmentedBarChartData) => {
      // check whether item is in segment list, if true return parent
      for(let i=0; i<items.length; ++i){
        if(items[i]===item){
          return parent;
        }
      }
      // check segments of current item recursive
      for(let i=0; i<items.length; ++i){
        if(items[i].segments && items[i].segments.length>0){
          const result = r(items[i].segments, items[i]);
          if(result!==null){
            return result;
          }
        }
      }
      return null;
    };
    return r(this.chartData, null);
  };

  /**
   * Returns an array for the given item with child segments. If the item doesn't have children, an empty array is returned.
   * @param parent 
   */
  protected getSegments(parent: InternalSegmentedBarChartData): InternalSegmentedBarChartData[] {
    if(parent===null){
      return this.chartData;
    }
    else if(parent.segments && parent.segments.length>0){
      return parent.segments;
    }
    else {
      return [];
    }
  };

  /**
   * Returns the value for the given item by recursive calculation.
   * @param item 
   */
  protected getValue(item: InternalSegmentedBarChartData): number {
    const v = (item: InternalSegmentedBarChartData): number => {
      const segments = this.getSegments(item);
      if(segments && segments.length>0){
        let result = 0;
        segments.forEach( (segment) => {
          result += v(segment);
        });
        return result;
      }
      else {
        return item.value;
      }
    };
    return v(item);
  };

  /**
   * Returns the maximum value for the children of the given item.
   * @param parent 
   */
  protected getMaxValue(parent: InternalSegmentedBarChartData = null): number {
    const segments = this.getSegments(parent);
    if(segments && segments.length>0){
      let result = 0;
      segments.forEach( (segment) => {
        const v = this.getValue(segment);
        if(v>result){
          result = v;
        }
      });
      return result;
    }
    else {
      return this.getValue(parent);
    }
  };

  /** reference to tooltip div element */
  private tooltip: HTMLDivElement;

  /**
   * Returns Tooltip text for the given segment
   * @param segment 
   */
  public getTooltipText(segment: SegmentedBarChartSegment): string {
    const text = segment.data.caption + ' (' + new DecimalPipe(this.locale).transform(this.getValue(segment.data), '1.'+this.decimals+'-'+this.decimals) + ')';
    return text;
  }

  /**
   * returns svg g element for segment target (could be rect or text elements)
   * @param element 
   */
  protected findSegment(element: Element): SVGGElement {
    // make sure to have a g element as target
    while(element.nodeName !== 'g'){ element = (element.parentElement as Element); }
    return (element as SVGGElement);
  }

  /**
   * fired when mouse enters a segment element and shows tooltip
   * @param event 
   */
  public overSegment(event: MouseEvent){
    const target = this.findSegment(event.target as Element);
    // get tooltip-text of segment
    const txt = target.getAttribute('tooltip');
    // show tooltip and assign text
    d3.select(this.tooltip)
      .html(txt)
      .style('display', 'block')
      .transition()
      .duration(250)
      .style('opacity', 1);
    // get index
    const idx = parseInt(target.getAttribute('segments-index'),10);
    // emit chart click event
    this.chartHover.emit(this.segments[idx].data.origin);
  };

  /**
   * fired when mouse moves over a segment element and adjusts tooltip
   * @param event 
   */
  public moveSegment(event: MouseEvent){
    // aggregate scroll positions, because event.page* properties are relative to top left corner of document
    let offsetX = 0;
    let offsetY = 0;
    let element = (this.tooltip.parentElement as HTMLElement);
    while(element){
      offsetX += element.scrollLeft;
      offsetY += element.scrollTop;
      element = element.parentElement;
    }
    // adjust tooltip
    d3.select(this.tooltip)
      .style('top', (event.pageY - offsetY + 10)+'px')
      .style('left', (event.pageX - offsetX + 10)+'px');
  };

  /**
   * fired when mouse leaves a segment element and hides tooltip
   * @param event 
   */
  public outSegment(event: MouseEvent){
    // hide tooltip
    d3.select(this.tooltip)
      .transition()
      .duration(250)
      .style('opacity',0)
      .on('end', () => {
        d3.select(this.tooltip).style('display', 'none')
      });
  };

  /**
   * Triggered when a user clicks on a chart segment / bar to go down in hierarchy.
   * @param segment 
   */
  public clickedSegment(segment: SegmentedBarChartSegment){
    // hide tooltip
    this.outSegment(undefined);
    // emit chart click event
    this.chartClick.emit(segment.data.origin);
    // make sure, animation isn't running
    if(this.animationActive) return ;
    // make sure, there are further child segments
    if(segment.data.segments && segment.data.segments.length>0){
      // go down to childs
      this.down(segment.data);
    }
  };

  /**
   * Triggered when user clicks on an empty space on the chart to go up in hierarchy.
   * @param event 
   */
  public clickedChart(event: MouseEvent): void {
    // make sure, animation isn't running
    if(this.animationActive) return ;
    // make sure, there is a parent segment. If activeSegment is null it is the root!
    if(this.activeSegment !== null){
      // get parent of current active segment
      const parent = this.getParent(this.activeSegment);
      // go up to parent
      this.up();
    }
  }

  /**
   * initialize chart height by maximal bar count
   */
  protected initHeight(): void {
    let maxBarCount = 0;
    const r = (segments: SegmentedBarChartData[]) => {
      if(segments.length>maxBarCount){
        maxBarCount = segments.length;
      }
      segments.forEach( (segment) => {
        if(segment.segments && segment.segments.length>0){
          r(segment.segments);
        }
      });
    };
    r(this.chartData);
    this.height = this.barOffsetTop + (maxBarCount * this.barHeight) + (this.barSpacing * (maxBarCount+1));
  };

  /**
   * Returns maximum caption width of all items.
   */
  protected getMaxCaptionWidth(): number {
    const text = (this.svg.querySelector('text.segment-text-measurement') as SVGTextElement);
    let maxWidth = 0;
    const r = (segments: SegmentedBarChartData[]) => {
      segments.forEach( (segment) => {
        text.textContent = segment.caption;
        const box = text.getBBox();
        if(box.width > maxWidth) maxWidth = box.width;
        if(segment.segments && segment.segments.length>0)
          r(segment.segments);
      });
    };
    r(this.chartData);
    return maxWidth;
  };

  /**
   * initialize bar left offset by maximal captio width
   */
  protected initOffsetLeft(): void {
    // get maximum caption width for the items
    const maxWidth = this.getMaxCaptionWidth();
    // calculate left offset
    this.barOffsetLeft = maxWidth + this.barSpacing;
  }

  /**
   * Returns segment data reference for given item
   * @param data 
   */
  protected getInternalData(data: SegmentedBarChartData): SegmentedBarChartSegment {
    let result;
    for(let i=0; i<this.segments.length; ++i){
      if(this.segments[i].data === data){
        result = this.segments[i];
        break;
      }
    }
    return result;
  }

  /**
   * returns a valid color, if no color is given a random color will be used
   * @param color 
   */
  protected validateColor(color: string | undefined): string {
    if(!color){
      return this.generateRandomColor();
    }
    return color;
  };

  /**
   * calculates the tick factor 
   * @param item 
   */
  protected calcTickFactor(item: InternalSegmentedBarChartData): number {
    const maxValue = this.getMaxValue(item);
    const maxBarWidth = (this.width - this.barOffsetLeft - this.barOffsetRight);
    return this.factor = ((maxBarWidth-1) / maxValue);
  };

  /**
   * Starts animation chain to display given item segements. Each step up or down will be animated like user has 
   * clicked on it.
   * @param navigateToItem item reference, which segments should be displayed
   */
  public navigateTo(navigateToItem: SegmentedBarChartData): void {
    // find item reference by original item:
    let item: InternalSegmentedBarChartData = null;
    const r = (items: InternalSegmentedBarChartData[]) => {
      for(let i=0; i<items.length; ++i){
        if(navigateToItem === items[i].origin){
          item = items[i];
          break;
        }
        else if(items[i].segments && items[i].segments.length > 0){
          r(items[i].segments);
        }
      }
    };
    r(this.chartData);
    // make sure item isn't current item yet
    if(item === this.activeSegment) return ;
    // make sure there is currently no running animation
    if(this.animationActive) return ;
    // generate parent tree for passed item
    let parentsA = [item];
    do {
      if(item !== null) {
        item = this.getParent(item);
        parentsA.unshift(item);
      }
    } while(item!==null);
    // generate parent tree for current item
    item = this.activeSegment;
    let parentsB = [item]
    do {
      if(item !== null) {
        item = this.getParent(item);
        parentsB.unshift(item);
      }
    } while(item!==null);
    // reduce both trees, so remove parents which are the same for both trees.
    let done = false;
    while(!done){
      const parA = parentsA[0];
      const parB = parentsB[0];
      if(parA === parB){
        parentsA.shift();
        parentsB.shift();
      }
      else {
        done = true;
      }
    }
    /**
     * inline function for level up animated navigation 
     */
    const navigateUp = () => {
      // switch to next level when current navigation has finished
      this.animationFinshed = () => {
        delete this.animationFinshed;
        navigate();
      };
      // get next level up parent from tree array
      // -> just need for remove it from the array
      const parent = parentsB.shift();
      // simulate user click on the white space of the chart to start level up animated navigation
      const clickElement = (this.svg.querySelector('rect.clickable-area') as SVGRectElement);
      this.simulateClick(clickElement);
    };
    /**
     * inline function for level down animated navigation
     */
    const navigateDown = () => {
      // switch to next level when current navigation has finised
      this.animationFinshed = () => {
        delete this.animationFinshed;
        navigate();
      };
      // get next level down parent from the tree array
      const parent = parentsA.shift();
      // identify and reference child in current segments for new parent
      const data = this.getInternalData(parent);
      // get index of new parent in current children
      const index = this.segments.indexOf(data);
      // simulate user click on the segment of the new parent to start level down animated navigation
      const segmentElement = (this.svg.querySelector('g.segment[segments-index="'+index+'"]') as SVGGElement);
      this.simulateClick(segmentElement);
    };
    /**
     * inline function for level up and down animated navigation
     */
    const navigate = () => {
      // while parentsB array contains items, do level up navigation
      if(parentsB.length > 0){
        navigateUp();
      }
      // while parentsB array contains items, do level down navigation
      else if(parentsA.length > 0){
        navigateDown();
      }
    };
    // start asynchron level up and down animated navigation
    navigate();
  };

  //*******************************************************************************************************************
  // reactions to chart data change
  //*******************************************************************************************************************

  /**
   * Reaction on chart data changes, hides current chart data and then shows new chart data
   */
  protected chartDataChanged(): void {
    // exec chart data hide
    const execHide = () => {
      delete this.animationFinshed;
      if(this.chartData.length > 0){
        this.hideChartData(() => { this.showChartData(); });
      }
      else {
        this.showChartData();
      }
    };
    // hook current animation and hide current data
    if(this.animationActive){
      this.animationFinshed = execHide;
    }
    else {
      execHide();
    }
  };

  /**
   * Hides chart data animated when previously chart data was assigned.
   */
  protected hideChartData(onComplete: () => void): void {
    // callback function to synchronize multiple asynchron animations
    let endCounter = 2;
    const endCallback = () => {
      if(--endCounter===0){
        this.animationActive = false;

        this.chartData = [];
        this.breadcrumbs = [];
        this.ticks = [];
        this.activeSegment = null;

        onComplete();
      }
    };
    // mark animation as active
    this.animationActive = true;
    // start bar animation
    d3.select(this.svg)
      .select('g.segments')
      .interrupt()
      .transition()
      .duration(this.duration)
      .attrTween('tween-segments', () => {
        // initialize interpolations for each element
        const interpolate = { rect: { width: [], opacity: [] }, text: { opacity: [] } };
        this.segments.forEach( (segment, idx) => {
          interpolate.rect.width[idx] = d3.interpolate(this.segments[idx].rect.width, 0);
          interpolate.rect.opacity[idx] = d3.interpolate(this.segments[idx].rect.opacity, 0);
          interpolate.text.opacity[idx] = d3.interpolate(this.segments[idx].text.opacity, 0);
        });
        // return factory function
        return (t: number): string => {
          this.segments.forEach( (segment, idx) => {
            if(interpolate.rect.width[idx]) segment.rect.width = interpolate.rect.width[idx](t);
            if(interpolate.rect.opacity[idx]) segment.rect.opacity = interpolate.rect.opacity[idx](t);
            if(interpolate.text.opacity[idx]) segment.text.opacity = interpolate.text.opacity[idx](t);
          });
          return '';
        }
      })
      .on('end', endCallback);
    // start tick animation
    d3.select(this.svg)
      .select('g.ticks')
      .interrupt()
      .transition()
      .duration(this.duration)
      .attrTween('tween-ticks', () => {
        // initialize interpolations for each element
        const interpolate = { opacity: [], x: [], value: [] };
        for(let i=0; i<this.ticks.length; ++i){
          interpolate.x[i] = d3.interpolate(this.ticks[i].x, this.barOffsetLeft);
          interpolate.value[i] = d3.interpolate(this.ticks[i].value, 0);
          interpolate.opacity[i] = d3.interpolate(this.ticks[i].opacity, 0);
        }
        // return factory function
        return (t: number): string => {
          const t1 = (t<0.5) ? t*2 : 1;
          const t2 = (t>=.5) ? (t-.5)*2 : 0;
          // exec interpolation for each tick
          this.ticks.forEach( (tick, idx) => {
            if(interpolate.x[idx]) tick.x = interpolate.x[idx](t);
            if(interpolate.value[idx]) tick.value = interpolate.value[idx](t);
            if(interpolate.opacity[idx]) tick.opacity = interpolate.opacity[idx](t);
          });
          return '';
        }
      })
      .on('end', endCallback);
  }

  //-------------------------------------------------------------------------------------------------------------------
  /**
   * Shows chart data animated when previously no data was assigned.
   */
  protected showChartData(): void {
    // make deep copy of chart data and assign origin references
    this.chartData = [];
    const r = (origins: SegmentedBarChartData[], items: InternalSegmentedBarChartData[]) => {
      for(let i=0; i<origins.length; ++i){
        const item: InternalSegmentedBarChartData = {
          caption: origins[i].caption,
          color: origins[i].color,
          value: origins[i].value,
          segments: (origins[i].segments && origins[i].segments.length>0) ? [] : undefined,
          origin: origins[i]
        };
        if(item.segments){
          r(origins[i].segments, item.segments);
        }
        items.push(item);
      }
    };
    r(this.data, this.chartData);
    // calculate chart height
    this.initHeight();
    // calculate chart left offset 
    this.initOffsetLeft();
    // get max value for new level
    const maxValue = this.getMaxValue();
    // calc tick factor for segment width
    this.calcTickFactor(null);
    // initialize segments
    this.segments = [];
    // initialize top offset for segments
    let offsetY = this.barOffsetTop + this.barSpacing;
    // initialize first level for segment data
    this.chartData.forEach( (data) => {
      const value = this.getValue(data);
      const segment: SegmentedBarChartSegment = {
        data: data,
        parent: null,
        value: value,
        color: this.validateColor(data.color),
        rect: {
          x: this.barOffsetLeft,
          y: offsetY,
          width: value * this.factor,
          height: this.barHeight,
          opacity: 1
        },
        text: {
          x: this.barOffsetLeft - this.barSpacing,
          y: offsetY + this.barHeight/2+4,
          opacity: 1
        }
      };
      offsetY += segment.rect.height + this.barSpacing;
      this.segments.push(segment);
    });
    // calc ticks
    this.ticks = this.calcTicks(maxValue);
    // callback function to synchronize multiple asynchron animations
    let endCounter = 2;
    const endCallback = () => {
      if(--endCounter===0){
        this.animationActive = false;
        if(this.animationFinshed){
          this.animationFinshed();
        }
      }
    };
    // mark animation as active
    this.animationActive = true;
    // start bar animation
    d3.select(this.svg)
      .select('g.segments')
      .interrupt()
      .transition()
      .duration(this.duration)
      .attrTween('tween-segments', () => {
        // initialize interpolations for each element
        const interpolate = { rect: { width: [], opacity: [] }, text: { opacity: [] } };
        this.segments.forEach( (segment, idx) => {
          interpolate.rect.width[idx] = d3.interpolate(0, this.segments[idx].rect.width);
          interpolate.rect.opacity[idx] = d3.interpolate(0, this.segments[idx].rect.opacity);
          interpolate.text.opacity[idx] = d3.interpolate(0, this.segments[idx].text.opacity);
        });
        // return factory function
        return (t: number): string => {
          this.segments.forEach( (segment, idx) => {
            if(interpolate.rect.width[idx]) segment.rect.width = interpolate.rect.width[idx](t);
            if(interpolate.rect.opacity[idx]) segment.rect.opacity = interpolate.rect.opacity[idx](t);
            if(interpolate.text.opacity[idx]) segment.text.opacity = interpolate.text.opacity[idx](t);
          });
          return '';
        }
      })
      .on('end', endCallback);
    // start tick animation
    d3.select(this.svg)
      .select('g.ticks')
      .interrupt()
      .transition()
      .duration(this.duration)
      .attrTween('tween-ticks', () => {
        // initialize interpolations for each element
        const interpolate = { opacity: [], x: [], value: [] };
        for(let i=0; i<this.ticks.length; ++i){
          interpolate.x[i] = d3.interpolate(this.barOffsetLeft, this.ticks[i].x);
          interpolate.value[i] = d3.interpolate(0, this.ticks[i].value);
          interpolate.opacity[i] = d3.interpolate(0, this.ticks[i].opacity);
        }
        // return factory function
        return (t: number): string => {
          const t1 = (t<0.5) ? t*2 : 1;
          const t2 = (t>=.5) ? (t-.5)*2 : 0;
          // exec interpolation for each tick
          this.ticks.forEach( (tick, idx) => {
            if(interpolate.x[idx]) tick.x = interpolate.x[idx](t);
            if(interpolate.value[idx]) tick.value = interpolate.value[idx](t);
            if(interpolate.opacity[idx]) tick.opacity = interpolate.opacity[idx](t);
          });
          return '';
        }
      })
      .on('end', endCallback);
  };

  //*******************************************************************************************************************
  // reactions to chart width change 
  //*******************************************************************************************************************

  /** defines hook callback function, when width change animation should be executed once */
  protected widthChangedAnimationHook: Function;

  /**
   * Checks whether an animation is running and set a hook to execute width change animation after current animation
   * and before next animation.
   */
  protected hookWidthChangedAnimation(): void {
    // if an animation is running: wait until current animation is finished and then start width animation
    if(this.animationActive){
      const oldAnimationFinished = this.animationFinshed;
      if(!this.widthChangedAnimationHook){
        this.widthChangedAnimationHook = () => {
          this.widthChangedAnimation(() => {
            this.animationFinshed = oldAnimationFinished;
            if(this.animationFinshed) this.animationFinshed();
          });
          delete this.widthChangedAnimationHook;
        };
        this.animationFinshed = () => {
          delete this.animationFinshed;
          this.widthChangedAnimationHook();
        };
      }
    }
    // if no animation is active: directly start with width animation
    else {
      this.widthChangedAnimation(() => {});
    }
  };

  /**
   * Starts animation for changing width of chart.
   */
  protected widthChangedAnimation(onFinished: (()=>void)): void {
    // callback function to synchronize multiple asynchron animations
    let endCounter = 2;
    const endCallback = () => {
      if(--endCounter===0) onFinished();
    };
    // calculate max value for current parent segments
    const maxValue = this.getMaxValue(this.activeSegment);
    // start animated tick change, use shorter duration
    this.animateTicks('down', maxValue, endCallback, 100);
    // recalc tick factor, used for bar width calculation
    this.calcTickFactor(this.activeSegment);
    // start segments animation with shorter duration
    d3.select(this.svg)
      .select('g.segments')
      .interrupt()
      .transition()
      .duration(100)
      .attrTween('tween-segments', () => {
        // initialize interpolations for each element
        const interpolate = { rect: { width: [] } };
        this.segments.forEach( (segment, idx) => {
          interpolate.rect.width[idx] = d3.interpolate(segment.rect.width, segment.value * this.factor);
        });
        // return factory function
        return (t: number): string => {
          // during animation assign new properties
          this.segments.forEach( (segment, idx) => {
            if(interpolate.rect.width[idx]) segment.rect.width = interpolate.rect.width[idx](t);
          });
          return '';
        }
      })
      .on('end', () => {
        // execute finish callback
        endCallback();
      });
  };

  //*******************************************************************************************************************
  // x axis tick calculation and animation
  //*******************************************************************************************************************

  /** current number of ticks on x axis */
  protected tickCount: number = 1;
  /** current value between two ticks */
  protected tickValue: number;
  /** current distance between two ticks */
  protected tickWidth: number;

  /**
   * Returns optimized ticks for the current width and tick values.
   * @param maxValue maximal value for the tick calculation
   * @returns optimized ticks
   */
  protected calcTicks(maxValue: number): SegmentedBarChartTick[] {
    // initialize return value
    let ticks: SegmentedBarChartTick[];
    // start with minimal space between two ticks
    let minSpace = 10;
    // checks whether the optimized tick calculation is done
    let done = false;
    // declare variables
    let tickCount: number, tickWidth: number, tickValue: number, decimals: number;
    // loop for optimized tick calculation
    while(!done){
      // get maximal bar width (=max value width)
      const maxWidth = this.width - this.barOffsetLeft - this.barOffsetRight - 1;
      // calc maximal tick counts by maximal bar width
      const maxTickCount = Math.floor(maxWidth / minSpace);
      // initialize tick count
      tickCount = maxTickCount + 1;
      // calc distance between two ticks
      tickWidth = (tickCount <= 1) ? maxWidth : (maxWidth) / (tickCount-1);
      // calc value between two ticks
      tickValue = (tickCount <= 1) ? maxValue : (maxValue) / (tickCount-1);
      // use maximal value to determine decimal places and factor for rounding display values
      // -> while at least one tick value with used factor is less then 0.9 reduce factor and enlarge decimal places
      let factor = 1; 
      decimals = 0;
      let clcTickValue = 0;
      do {
        clcTickValue = tickValue / factor;
        if(clcTickValue < .9){
          factor = factor / 10;
          decimals = decimals + 1;
        }
      } while(clcTickValue < .9);
      // get rounded value between two ticks
      tickValue = Math.ceil(tickValue / factor) * factor;
      // get distance between to ticks by rounded value
      tickWidth = tickValue / maxValue  * maxWidth;
      // recalc tick count
      tickCount = Math.floor(maxValue / tickValue)+1;
      // calculate width of maximal tick value text using current locale settings
      const width = new DecimalPipe(this.locale).transform(maxValue, '1.'+decimals+'-'+decimals).length * 7;
      // if width is less than the used minimal space between two ticks use value width + 10 as minimal space for next round
      if(width <= minSpace){
        done = true;
      } 
      else {
        minSpace = width + 10;
      }
    }
    // calculate ticks
    ticks = [];
    for(let i=0; i<tickCount; ++i){
      // calculate value of tick
      const value = i * tickValue;
      // calculate x position of tick
      const x = this.barOffsetLeft + (i * tickWidth);
      // estimate width of tick value as text
      const width = new DecimalPipe(this.locale).transform(value, '1.'+decimals+'-'+decimals).length * 7;
      // make sure tick value as text could be displayed completely, if not hide text by opactiy
      const opacity = (x > this.width - (width/2)) ? 0 : 1;
      // create tick entry
      ticks.push({
        value: value,
        decimals: decimals,
        opacity: opacity,
        x: x
      });
    }
    // store tick count as class attribute
    this.tickCount = tickCount;
    // store value between two ticks as class attribute
    this.tickValue = tickValue;
    // store distance between two ticks as class attribute
    this.tickWidth = tickWidth;
    // store decimals
    this.decimals = decimals;
    // return optimized ticks
    return ticks;
  };

  //-------------------------------------------------------------------------------------------------------------------

  /**
   * Executes animation cycle for x axis ticks. Can be used for animate level step down and up.
   * @param direction level step direction (d-down / u-up)
   * @param maxValue maximal value for level
   * @param endCallback callback function, which will be triggered after animation has finished
   */
  protected animateTicks(direction: string, maxValue: number, endCallback: (()=>void), duration?: number): void {
    // references old tick calculations
    const oldTickValue = this.tickValue;
    const oldTickWidth = this.tickWidth;
    // get optimized tick values for new level
    const ticks = this.calcTicks(maxValue);
    // references new tick calculations
    const newTickValue = this.tickValue;
    const newTickWidth = this.tickWidth;

    let deleteTicks = 0;
    // Add old ticks to new tick array, if they are not existing anymore. Therefore simulate new tick values and 
    // positions for sliding out animation.
    if(this.ticks.length > ticks.length){
      for(let i=ticks.length; i<this.ticks.length; ++i){
        // create deep copy of tick object
        const tick = JSON.parse(JSON.stringify(this.ticks[i]));
        // create x position and value for tick by using new tick calculations
        tick.x = this.barOffsetLeft + (i * newTickWidth);
        tick.value = i * newTickValue;
        // tick should fading out while animation
        tick.opacity = 0;
        // add tick to new tick array
        ticks.push(tick);
        // save number of ticks, which must be deleted after animation ends
        ++deleteTicks;
      }
    }
    // Add new ticks to old tick array, if they are new. Therefor simulate old tick values and
    // positions for sliding in animation.
    if(ticks.length > this.ticks.length){
      for(let i=this.ticks.length; i<ticks.length; ++i){
        // create deep copy of tick object
        const tick = JSON.parse(JSON.stringify(ticks[i]));
        // create x position and value for tick by using old tick calculations
        tick.x = this.barOffsetLeft + (i * oldTickWidth);
        tick.value = i * oldTickValue;
        // tick should fading out while animation
        tick.opacity = 0;
        // add tick to old tick array
        this.ticks.push(tick);
      }
    }
    // when level down: use factor and decimals from new ticks for displaying
    for(let i=0; i<this.ticks.length; ++i){
      if(direction.charAt(0) === 'd'){
        this.ticks[i].decimals = ticks[0].decimals;  
      }
    }
    // start tick animation
    if(!duration) duration = this.duration / this.animateDownCycles;
    d3.select(this.svg)
      .select('g.ticks')
      .interrupt()
      .transition()
      .duration(duration)
      .attrTween('tween-ticks', () => {
        // initialize interpolations for each element
        const interpolate = { opacity: [], x: [], value: [] };
        for(let i=0; i<this.ticks.length; ++i){
          interpolate.x[i] = d3.interpolate(this.ticks[i].x, ticks[i].x);
          interpolate.value[i] = d3.interpolate(this.ticks[i].value, ticks[i].value);
          interpolate.opacity[i] = d3.interpolate(this.ticks[i].opacity, ticks[i].opacity);
        }
        // return factory function
        return (t: number): string => {
          // exec interpolation for each tick
          this.ticks.forEach( (tick, idx) => {
            if(interpolate.x[idx]) tick.x = interpolate.x[idx](t);
            if(interpolate.value[idx]) tick.value = interpolate.value[idx](t);
            if(interpolate.opacity[idx]) tick.opacity = interpolate.opacity[idx](t);
          });
          return '';
        }
      })
      // on end of animation
      .on('end', () => {
        // when level up: use factor and decimals from new ticks for displaying
        if(direction.charAt(0) === 'u'){
          for(let i=0; i<this.ticks.length; ++i){
            this.ticks[i].decimals = ticks[0].decimals;  
          }
        }
        // delete temporary added ticks from array
        for(let i=0; i<deleteTicks; ++i){
          this.ticks.pop();
        }
        // execute callback function to specify animation has finished
        endCallback(); 
      });
  };

  //*******************************************************************************************************************
  // algorithms for animated going down
  //*******************************************************************************************************************

  /** number of cycles for one down animation */
  protected readonly animateDownCycles = 3;

  /**
   * starts down animation for a visible child
   * @param item 
   */
  protected down(item: InternalSegmentedBarChartData): void {
    // get reference to internal data
    const data = this.getInternalData(item);
    // store current item
    this.activeSegment = item;
    // mark animation as active
    this.animationActive = true;
    // define finished callback
    const onFinished = () => {
      this.animationActive = false;
      if(this.animationFinshed) this.animationFinshed();
    };
    // start down animation cycle
    this.down01(data, onFinished);
  };

  //-------------------------------------------------------------------------------------------------------------------

  /**
   * first animation cyle (not animated, just for preparing, will be done in 0ms)
   * @param item item reference to new parent item
   */
  protected down01(item: SegmentedBarChartSegment, onFinished: (()=>void)): void {
    // animate segments and bars
    this.down01segments(item);
    // animate breadcrumbs
    this.down01breadcrumbs(item);
    // start next animation cycle
    setTimeout( () => { this.down02(item, onFinished) }, 0);
  };

  /**
   * first animation cyle for segments and bars
   * @param item item reference to new parent item
   */
  protected down01segments(item: SegmentedBarChartSegment): void {
    // get segments of item
    const segments = this.getSegments(item.data);
    // calculate initial top and left offset for segments
    let offsetY = this.barOffsetTop + this.barSpacing;
    let offsetX = this.barOffsetLeft;
    // loop all segements
    segments.forEach( (seg) => {
      // get value for current segment
      const value = this.getValue(seg);
      // initialize new segments
      const segment: SegmentedBarChartSegment = {
        data: seg,
        parent: item.data,
        value: value,
        color: this.validateColor(seg.color),
        rect: {
          x: offsetX,
          y: item.rect.y,
          width: value * this.factor,
          height: this.barHeight,
          opacity: 0
        },
        text: {
          x: this.barOffsetLeft - this.barSpacing,
          y: offsetY + this.barHeight/2 + 4,
          opacity: 0
        }
      };
      // update offsets
      offsetX += segment.rect.width;
      offsetY += segment.rect.height + this.barSpacing;
      // add segment to display array
      this.segments.push(segment);
    });
  };

  /**
   * first animation cyle for breadcrumbs
   * @param item item reference to new parent item
   */
  protected down01breadcrumbs(item: SegmentedBarChartSegment): void {
    // create breadcrumb entry
    const breadcrumb: SegmentedBarChartBreadcrumb = {
      data: item.data,
      x: item.text.x,
      y: item.text.y,
      color: item.color,
      opacity: 0
    };
    // add breadcrumb entry
    this.breadcrumbs.push(breadcrumb);
  };

  //-------------------------------------------------------------------------------------------------------------------

  /**
   * second animation cylce
   * @param item item reference to new parent item
   */
  protected down02(item: SegmentedBarChartSegment, onFinished: (()=>void)): void {
    // callback function to synchronize multiple asynchron animations
    let endCounter = 2;
    const endCallback = () => {
      if(--endCounter===0) this.down03(item, onFinished);
    };
    // animate segments and bars
    this.down02segments(item, endCallback);
    // animate breadcrumbs
    this.down02breadcrumbs(item, endCallback);
  };

  /**
   * second animation cyle for segments and bars
   * @param item item reference to new parent item
   */
  protected down02segments(item: SegmentedBarChartSegment, endCallback: (()=>void)): void {
    // start segments animation
    d3.select(this.svg)
      .select('g.segments')
      .interrupt()
      .transition()
      .duration(this.duration / this.animateDownCycles)
      .attrTween('tween-segments', () => {
        // initialize interpolations for each element
        const interpolate = { rect: { opacity: [], width: [] }, text: { opacity: [] } };
        this.segments.forEach( (segment, idx) => {
          // a) segment is a child
          if(segment.parent === item.data){
            // show bar by opacity
            interpolate.rect.opacity[idx] = d3.interpolate(segment.rect.opacity, 1);
          }
          // b) segment is the parent
          else if(segment === item){
            // hide bar by opacity
            interpolate.rect.opacity[idx] = d3.interpolate(segment.rect.opacity, 0);
            // hide text by opacity
            interpolate.text.opacity[idx] = d3.interpolate(segment.text.opacity, 0);
          }
          // c) segment is on the parent level
          else {
            // hide bar by width
            interpolate.rect.width[idx] = d3.interpolate(segment.rect.width, 0);
            // hide text by opacity
            interpolate.text.opacity[idx] = d3.interpolate(segment.text.opacity, 0);
          }
        });
        // return factory function
        return (t: number): string => {
          // during animation assign new properties
          this.segments.forEach( (segment, idx) => {
            if(interpolate.rect.opacity[idx]) segment.rect.opacity = interpolate.rect.opacity[idx](t);
            if(interpolate.rect.width[idx]) segment.rect.width = interpolate.rect.width[idx](t);
            if(interpolate.text.opacity[idx]) segment.text.opacity = interpolate.text.opacity[idx](t);
          });
          return '';
        }
      })
      // on end of animation
      .on('end', () => { endCallback(); });
  };

  /**
   * second animation cyle for breadcrumbs
   * @param item item reference to new parent item
   */
  protected down02breadcrumbs(item: SegmentedBarChartSegment, endCallback: (()=>void)): void {
    // start breadcrumbs animation
    d3.select(this.svg)
      .select('g.breadcrumbs')
      .interrupt()
      .transition()
      .duration(this.duration / this.animateDownCycles)
      .attrTween('tween-breadcrumbs', () => {
        // initialize interpolations for each element
        const interpolate = { x: [], y: [], color: [], opacity: [] };
        this.breadcrumbs.forEach( (breadcrumb, idx) => {
          // if breadcrumb is last element, show by opacity
          if(idx === this.breadcrumbs.length-1){
            interpolate.opacity[idx] = d3.interpolate(breadcrumb.opacity, 1);
          }
        });
        // return factory function
        return (t:number): string => {
          // during animation assign new properties
          this.breadcrumbs.forEach( (breadcrumb, idx) => {
            if(interpolate.opacity[idx]) breadcrumb.opacity = interpolate.opacity[idx](t);
          });
          return '';
        };
      })
      // on end of animation
      .on('end', () => { endCallback(); });
  };

  //-------------------------------------------------------------------------------------------------------------------

  /**
   * third animation cyle
   * @param item item reference to new parent item
   */
  protected down03(item: SegmentedBarChartSegment, onFinished: (()=>void)): void {
    // first delete all invisible segments
    for(let i=this.segments.length-1; i>=0; --i){
      // a segment is invisible if it's parent doesn't match the active parent
      if(this.segments[i].parent !== this.activeSegment){
        this.segments.splice(i,1);
      }
    }
    // callback function to synchronize multiple asynchron animations
    let endCounter = 2;
    const endCallback = () => {
      if(--endCounter===0) this.down04(item, onFinished);
    };
    // animate segments and bars
    this.down03segments(item, endCallback);
    // animate breadcrumbs
    this.down03breadcrumbs(item, endCallback);
  };

  /**
   * third animation cyle for segments and bars
   * @param item item reference to new parent item
   */
  protected down03segments(item: SegmentedBarChartSegment, endCallback: (()=>void)): void {
    // second move all visible entries to new positions
    d3.select(this.svg)
      .select('g.segments')
      .interrupt()
      .transition()
      .duration(this.duration / this.animateDownCycles)
      .attrTween('tween-segments', () => {
        // initialize interpolations for each element
        const interpolate = { x: [], y: [] };
        let offsetY = this.barOffsetTop + this.barSpacing;
        this.segments.forEach( (segment, idx) => {
          interpolate.x[idx] = d3.interpolate(segment.rect.x, this.barOffsetLeft);
          interpolate.y[idx] = d3.interpolate(segment.rect.y, offsetY);
          offsetY += this.barHeight + this.barSpacing;
        });
        // return factory function
        return (t: number): string => {
          // during animation assign new properties
          this.segments.forEach( (segment, idx) => {
            segment.rect.x = interpolate.x[idx](t);
            segment.rect.y = interpolate.y[idx](t);
          });
          return '';
        }
      })
      // on end of animation
      .on('end', () => { endCallback(); });
  };

  /**
   * third animation cyle for breadcrumbs
   * @param item item reference to new parent item
   */
  protected down03breadcrumbs(item: SegmentedBarChartSegment, endCallback: (()=>void)): void {
    // calculate new position for breadcrumb entry
    let offsetX = 0;
    const bc = d3.select(this.svg)
      .selectAll('g.breadcrumb text')
      .each( function(arg0, idx, nodeList){
        const bbox = (this as SVGTextElement).getBBox();
        offsetX += bbox.width + ((idx>0) ? 15: 28);
      });
    // start animation for breadcrumb entry
    d3.select(this.svg)
      .select('g.breadcrumbs')
      .interrupt()
      .transition()
      .duration(this.duration / this.animateDownCycles)
      .attrTween('tween-breadcrumbs', () => {
        // initialize interpolations for each element
        const interpolate = { x: [], y: [], color: [], opacity: [] };
        this.breadcrumbs.forEach( (breadcrumb, idx) => {
          // only animate last breadcrumb element
          if(idx === this.breadcrumbs.length-1){
            interpolate.x[idx] = d3.interpolate(breadcrumb.x, offsetX);
            interpolate.y[idx] = d3.interpolate(breadcrumb.y, 10);
            interpolate.color[idx] = d3.interpolate(breadcrumb.color, '#000000');
            interpolate.opacity[idx] = d3.interpolate(breadcrumb.opacity, 1);
          }
        });
        // return factory function
        return (t:number): string => {
          // during animation assign new properties
          this.breadcrumbs.forEach( (breadcrumb, idx) => {
            if(interpolate.x[idx]) breadcrumb.x = interpolate.x[idx](t);
            if(interpolate.y[idx]) breadcrumb.y = interpolate.y[idx](t);
            if(interpolate.color[idx]) breadcrumb.color = interpolate.color[idx](t);
            if(interpolate.opacity[idx]) breadcrumb.opacity = interpolate.opacity[idx](t);
          });
          return '';
        };
      })
      // on end of animation
      .on('end', () => { endCallback(); });
  };

  //-------------------------------------------------------------------------------------------------------------------

  /**
   * fourth animation cyle
   * @param item item reference to new parent item
   */
  protected down04(item: SegmentedBarChartSegment, onFinished: (()=>void)): void {
    // callback function to synchronize multiple asynchron animations
    let endCounter = 2;
    const endCallback = () => {
      if(--endCounter===0) onFinished();
    };
    // animate segments and bars
    this.down04segments(item, endCallback);
    // animate axis ticks
    this.down04ticks(item, endCallback);
  };

  /**
   * fourth animation cyle for segments and bars
   * @param item item reference to new parent item
   */
  protected down04segments(item: SegmentedBarChartSegment, endCallback: (()=>void)): void {
    this.calcTickFactor(item.data);
    d3.select(this.svg)
      .select('g.segments')
      .interrupt()
      .transition()
      .duration(this.duration / this.animateDownCycles)
      .attrTween('tween-segments', () => {
        // initialize interpolations for each element
        const interpolate = { rect: { width: [] }, text: { opacity: [] } };
        this.segments.forEach( (segment, idx) => {
          // resize bar width
          interpolate.rect.width[idx] = d3.interpolate(segment.rect.width, segment.value * this.factor);
          // show text by opacity
          interpolate.text.opacity[idx] = d3.interpolate(0, 1);
        });
        // return factory function
        return (t: number): string => {
          // during animation assign new properties
          this.segments.forEach( (segment, idx) => {
            if(interpolate.rect.width[idx])
              segment.rect.width = interpolate.rect.width[idx](t);
            if(interpolate.text.opacity[idx])
              segment.text.opacity = interpolate.text.opacity[idx](t);
          });
          return '';
        }
      })
      // on end of animation
      .on('end', () => { endCallback(); });
  };

  /**
   * fourth animation cyle for x axis ticks
   * @param item item reference to new parent item
   */
  protected down04ticks(item: SegmentedBarChartSegment, endCallback: (()=>void)): void {
    // get maximal value new parent item
    const maxValue = this.getMaxValue(item.data);
    // start x axis animation for ticks
    this.animateTicks('d', maxValue, endCallback);
  };

  //*******************************************************************************************************************
  // algorithms for animated going up
  //*******************************************************************************************************************

  /** number of cycles for one up animation */
  protected readonly animateUpCycles = 3;

  /**
   * starts down animation for the parent
   * @param item 
   */
  protected up(): void {
    // get reference of current parent
    const item = this.activeSegment;
    // identify parent of this item
    const parent = this.getParent(item);
    // set reference to new parent
    this.activeSegment = parent;
    // mark animation as active
    this.animationActive = true;
    // define finished callback
    const onFinished = () => {
      // mark animation as done
      this.animationActive = false;
      // if finish callback is defined, execute it
      if(this.animationFinshed) this.animationFinshed();
    };
    // start up animation cycle
    this.up01(item, onFinished);
  };

  //-------------------------------------------------------------------------------------------------------------------

  /**
   * first animation cylce
   * @param item 
   * @param onFinished 
   */
  protected up01(item: SegmentedBarChartData, onFinished: (()=>void)): void {
    // callback function to synchronize multiple asynchron animations
    let endCounter = 2;
    const endCallback = () => {
      if(--endCounter===0) this.up02(item, onFinished);
    };
    // animate segments and bars
    this.up01segments(item, endCallback);
    // animate x axis ticks
    this.up01ticks(item, endCallback);
  };

  /**
   * first animation cycle for segments and bars
   * @param item 
   * @param endCallback 
   */
  protected up01segments(item: SegmentedBarChartData, endCallback: (()=>void)): void {
    this.calcTickFactor(this.activeSegment);
    d3.select(this.svg)
      .select('g.segments')
      .interrupt()
      .transition()
      .duration(this.duration / this.animateUpCycles)
      .attrTween('tween-segments', () => {
        // initialize interpolations for each element
        const interpolate = { rect: { width: [] }, text: { opacity: [] } };
        this.segments.forEach( (seg, idx) => {
          interpolate.rect.width[idx] = d3.interpolate(seg.rect.width, seg.value * this.factor);
          interpolate.text.opacity[idx] = d3.interpolate(1, 0);
        });
        // return factory function
        return (t: number): string => {
          // during animation assign new properties
          this.segments.forEach( (seg, idx) => {
            if(interpolate.rect.width[idx])
              seg.rect.width = interpolate.rect.width[idx](t);
            if(interpolate.text.opacity[idx])
              seg.text.opacity = interpolate.text.opacity[idx](t);
          })
          return '';
        }
      })
      // on end of animation
      .on('end', () => { endCallback(); });
  };

  /**
   * first animation cyle for x axis ticks
   * @param item item reference to old parent item
   */
  protected up01ticks(item: SegmentedBarChartData, endCallback: (()=>void)): void {
    // get maximal value for new parent item
    const maxValue = this.getMaxValue(this.activeSegment);
    // start x axis animation for ticks
    this.animateTicks('u', maxValue, endCallback);
  };

  //-------------------------------------------------------------------------------------------------------------------

  /**
   * second animation cycle
   * @param item 
   * @param onFinished 
   */
  protected up02(item: SegmentedBarChartData, onFinished: (()=>void)): void {
    // callback function to synchronize multiple asynchron animations
    let endCounter = 2;
    const endCallback = () => {
      if(--endCounter===0) this.up03(item, onFinished);
    };
    // animate segments and bars
    this.up02segments(item, endCallback);
    // animate x axis ticks
    this.up02breadcrumbs(item, endCallback);
  };

  /**
   * second animation cycle for segments and bars
   * @param item 
   * @param endCallback 
   */
  protected up02segments(item: SegmentedBarChartData, endCallback: (()=>void)): void {
    // initialize top offset for bars
    let offsetY = this.barOffsetTop + this.barSpacing;
    // get segments of new parent
    const parSegments = this.getSegments(this.activeSegment);
    // calculate top offset for current item in new parent view
    for(let i=0; i<parSegments.length; ++i){
      if(parSegments[i]===item){
        break;
      }
      offsetY += this.barHeight + this.barSpacing;
    }
    // initialize left offset for bars
    let offsetX = this.barOffsetLeft;
    // second move all visible entries to new positions
    d3.select(this.svg)
      .select('g.segments')
      .interrupt()
      .transition()
      .duration(this.duration / this.animateUpCycles)
      .attrTween('tween-segments', () => {
        // initialize interpolations for each element
        const interpolate = { x: [], y: [] };
        this.segments.forEach( (segment, idx) => {
          interpolate.x.push(d3.interpolate(segment.rect.x, offsetX));
          interpolate.y.push(d3.interpolate(segment.rect.y, offsetY));
          // update left offset for next segment
          offsetX += segment.rect.width;
        });
        // return factory function
        return (t: number): string => {
          // during animation assign new properties
          this.segments.forEach( (segment, idx) => {
            segment.rect.x = interpolate.x[idx](t);
            segment.rect.y = interpolate.y[idx](t);
          });
          return '';
        }
      })
      // on end of animation
      .on('end', () => { endCallback(); });
  };

  /**
   * second animation cycle for breadcrumbs
   * @param item 
   * @param endCallback 
   */
  protected up02breadcrumbs(item: SegmentedBarChartData, endCallback: (()=>void)): void {
    // initialize top offset for bars and segments
    let offsetY = this.barOffsetTop + this.barSpacing;
    // get segments of new parent
    const parSegments = this.getSegments(this.activeSegment);
    // calculate new top offset for current item in parent view
    for(let i=0; i<parSegments.length; ++i){
      if(parSegments[i]===item){
        break;
      }
      offsetY += this.barHeight + this.barSpacing;
    }
    // initialize left offset for bars
    let offsetX = this.barOffsetLeft;
    // move breadcrumb entry
    d3.select(this.svg)
      .select('g.breadcrumbs')
      .interrupt()
      .transition()
      .duration(this.duration / this.animateUpCycles)
      .attrTween('tween-breadcrumbs', () => {
        // initialize interpolations for each element
        const interpolate = { x: [], y: [], color: [] };
        this.breadcrumbs.forEach( (breadcrumb, idx) => {
          // if it's the last breadcrumb item
          if(idx >= this.breadcrumbs.length-1) {
            interpolate.x[idx] = d3.interpolate(breadcrumb.x, offsetX - this.barSpacing);
            interpolate.y[idx] = d3.interpolate(breadcrumb.y, offsetY + this.barHeight/2+4);
            interpolate.color[idx] = d3.interpolate(breadcrumb.color, breadcrumb.data.color);
          }
        });
        // return factory function
        return (t:number): string => {
          // during animation assign new properties
          this.breadcrumbs.forEach( (breadcrumb, idx) => {
            if(interpolate.x[idx]) breadcrumb.x = interpolate.x[idx](t);
            if(interpolate.y[idx]) breadcrumb.y = interpolate.y[idx](t);
            if(interpolate.color[idx]) breadcrumb.color = interpolate.color[idx](t);
          });
          return '';
        };
      })
      // on end of animation
      .on('end', () => { endCallback(); });
  };

  //-------------------------------------------------------------------------------------------------------------------

  /**
   * third animation cycle (not animated, just for preparing, will be done in 0ms)
   * @param item 
   * @param onFinished 
   */
  protected up03(item: SegmentedBarChartData, onFinished: (()=>void)): void {
    // animate segments and bars
    this.up03segments(item);
    // directly execute next animation cylce
    this.up04(item, onFinished);
  };

  /**
   * third animation cycle for segments and bars
   * @param item 
   */
  protected up03segments(item: SegmentedBarChartData): void {
    // initialize top and left offset for bars and segments
    let offsetY = this.barOffsetTop + this.barSpacing;
    let offsetX = this.barOffsetLeft;
    // get segments for new parent
    const segments = this.getSegments(this.activeSegment);
    // initialize objects for the new bars
    segments.forEach( (data, idx) => {
      const value = this.getValue(data);
      const segment: SegmentedBarChartSegment = {
        data: data,
        parent: this.activeSegment,
        value: value,
        color: data.color,
        rect: {
          x: offsetX,
          y: offsetY,
          width: value * this.factor,
          height: this.barHeight,
          opacity: 1
        },
        text: {
          x: this.barOffsetLeft - this.barSpacing,
          y: offsetY + this.barHeight/2+4,
          opacity: 1
        }
      };
      offsetY += segment.rect.height + this.barSpacing;
      this.segments.splice(idx, 0, segment);
    });
  };

  //-------------------------------------------------------------------------------------------------------------------

  /**
   * fourth animation cycle
   * @param item 
   * @param onFinished 
   */
  protected up04(item: SegmentedBarChartData, onFinished: (()=>void)): void {
    // callback function to synchronize multiple asynchron animations
    let endCounter = 2;
    const endCallback = () => {
      if(--endCounter===0) onFinished();
    };
    // animate segments and bars
    this.up04segments(item, endCallback);
    // animate breadcrumbs
    this.up04breadcrumbs(item, endCallback);
  };
  
  /**
   * fourth animation cycle for segments and bars
   * @param item 
   * @param endCallback 
   */
  protected up04segments(item: SegmentedBarChartData, endCallback: (()=>void)): void {
    d3.select(this.svg)
      .select('g.segments')
      .interrupt()
      .transition()
      .duration(this.duration / this.animateUpCycles)
      .attrTween('tween-segments', () => {
        // initialize interpolations for each element
        const interpolate = { rect: { opacity: [], width: [] }, text: { opacity: [] } };
        this.segments.forEach( (seg, idx) => {
          // a) segment is the old parent
          if(seg.data === item){
            // show bar by opacity
            interpolate.rect.opacity[idx] = d3.interpolate(seg.rect.opacity, 1);
          }
          // b) segment is on the parent level
          else if(seg.parent === this.activeSegment){
            // show bar by width
            interpolate.rect.width[idx] = d3.interpolate(0, seg.rect.width);
            // show text by opacity
            interpolate.text.opacity[idx] = d3.interpolate(0, seg.text.opacity);
          }
          // c) segment is a children
          else {
            // hide bar by opacity
            interpolate.rect.opacity[idx] = d3.interpolate(seg.rect.opacity, 0);
          }
        });
        // return factory function
        return (t: number): string => {
          // during animation assign new properties
          this.segments.forEach( (seg, idx) => {
            if(interpolate.rect.opacity[idx])
              seg.rect.opacity = interpolate.rect.opacity[idx](t);
            if(interpolate.rect.width[idx])
              seg.rect.width = interpolate.rect.width[idx](t);
            if(interpolate.text.opacity[idx])
              seg.text.opacity = interpolate.text.opacity[idx](t);
          });
          return '';
        }
      })
      .on('end', () => {
        // remove last breadcrumb entry
        this.breadcrumbs.pop();
        for(let i=this.segments.length-1; i>=0; --i){
          if(this.segments[i].parent!==this.activeSegment){
            this.segments.splice(i, 1);
          }
        }
        endCallback();
      });
  };

  /**
   * fourth animation cycle for breadcrumbs
   * @param item 
   * @param endCallback 
   */
  protected up04breadcrumbs(item: SegmentedBarChartData, endCallback: (()=>void)): void {
    d3.select(this.svg)
      .select('g.breadcrumbs')
      .interrupt()
      .transition()
      .duration(this.duration / this.animateUpCycles)
      .attrTween('tween-breadcrumbs', () => {
        // initialize interpolations for each element
        const interpolate = { opacity: [] };
        this.breadcrumbs.forEach( (breadcrumb, idx) => {
          // if it's the last breadcrumb item
          if(idx >= this.breadcrumbs.length-1) {
            interpolate.opacity[idx] = d3.interpolate(breadcrumb.opacity, 0);
          }
        });
        // return factory function
        return (t:number): string => {
          // during animation assign new properties
          this.breadcrumbs.forEach( (breadcrumb, idx) => {
            if(interpolate.opacity[idx]) breadcrumb.opacity = interpolate.opacity[idx](t);
          });
          return '';
        };
      })
      // on end of animation
      .on('end', () => { endCallback(); });
  };

  //*******************************************************************************************************************

}
