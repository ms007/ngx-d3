import { Component, OnInit, Input, ElementRef, Inject, LOCALE_ID } from '@angular/core';

import * as d3 from 'd3';
import { DecimalPipe } from '@angular/common';

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

export interface SegmentedBarChartSegment  {
  data: SegmentedBarChartData;
  parent: SegmentedBarChartData;
  value: number;
  color: string;
  rect: {
    x: number,
    y: number,
    width: number,
    height: number,
    opacity: number
  },
  text: {
    x: number,
    y: number,
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
  data: SegmentedBarChartData, 
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
export class SegmentedBarChartComponent implements OnInit {

  @Input() data: SegmentedBarChartData[] = [];

  @Input() width: number = 600;

  /*@Input() height: number = 400;*/
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
  public activeSegment: SegmentedBarChartData = null;
  /** tick definition for x axis */
  public ticks: SegmentedBarChartTick[] = [];
  /** breadcrumb entries */
  public breadcrumbs: SegmentedBarChartBreadcrumb[] = [];
  /** current  for x axis */
  public factor: number = 1;
  /** true when animation is still active to prevent user actions */
  protected animationActive: boolean = false;

  /** duration in milliseconds for one animation cycle */
  protected duration: number = 2500;

  

  constructor(
    private element: ElementRef,
    @Inject(LOCALE_ID) private locale: string
  ) { }



  ngOnInit() {
    this.svg = (this.element.nativeElement as HTMLElement).querySelector('svg');

    window['SBCC'] = this;

    console.log(this.data);
    this.initialize();
  };

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

  protected getParent(item: SegmentedBarChartData): SegmentedBarChartData {
    const r = (items: SegmentedBarChartData[], parent: SegmentedBarChartData) => {
      for(let i=0; i<items.length; ++i){
        if(items[i]===item){
          return parent;
        }
      }
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
    return r(this.data, null);
  };

  protected getSegments(parent: SegmentedBarChartData): SegmentedBarChartData[] {
    if(parent===null){
      return this.data;
    }
    else if(parent.segments && parent.segments.length>0){
      return parent.segments;
    }
    else {
      return [];
    }
  };

  protected getValue(item: SegmentedBarChartData): number {
    const v = (item: SegmentedBarChartData): number => {
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

  protected getMaxValue(parent: SegmentedBarChartData = null): number {
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

  public console = console;

  /**
   * Triggered when a user clicks on a chart segment / bar to go down in hierarchy.
   * @param segment 
   */
  public clickedSegment(segment: SegmentedBarChartSegment){
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
    r(this.data);

    this.height = this.barOffsetTop + (maxBarCount * this.barHeight) + (this.barSpacing * (maxBarCount+1));
  };

  protected initOffsetLeft(): void {
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
    r(this.data);
    console.log('maxWidth:%o',maxWidth);
    this.barOffsetLeft = maxWidth + this.barSpacing;
  }

  protected initialize(): void {
    this.initHeight();
    this.initOffsetLeft();

    const maxValue = this.getMaxValue();
    const maxBarWidth = (this.width - this.barOffsetLeft - this.barOffsetRight);
    const factor = this.factor = ((maxBarWidth-1) / maxValue);

    this.segments = [];
    let offsetY = this.barOffsetTop + this.barSpacing;

    this.data.forEach( (data) => {
      const value = this.getValue(data);
      const segment: SegmentedBarChartSegment = {
        data: data,
        parent: null,
        value: value,
        color: data.color,
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

    this.ticks = this.calcTicks(maxValue);


  };

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

  protected validateColor(color: string | undefined): string {
    return color;
  };

  /**
   * calculates the tick factor 
   * @param item 
   */
  protected calcTickFactor(item: SegmentedBarChartData): number {
    const maxValue = this.getMaxValue(item);
    const maxBarWidth = (this.width - this.barOffsetLeft - this.barOffsetRight);
    return this.factor = ((maxBarWidth-1) / maxValue);
  };

  public navigateTo(item: SegmentedBarChartData): void {
    if(item === this.activeSegment) return ;
    if(this.animationActive) return ;
    console.warn('navigateTo item:%o',item);
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
    // reduce parents
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
    console.log('parentsA:%o parentsB:%o',parentsA,parentsB);
    // start animation cycles
    const navigateUp = () => {
      this.animationFinshed = () => {
        delete this.animationFinshed;
        navigate();
      };
      const parent = parentsB.shift();
      console.warn('navigateUp parent:%o',parent);
      const clickElement = (this.svg.querySelector('rect.clickable-area') as SVGRectElement);
      this.simulateClick(clickElement);
    };

    const navigateDown = () => {
      this.animationFinshed = () => {
        delete this.animationFinshed;
        navigate();
      };
      const parent = parentsA.shift();
      console.warn('navigateDown parent:%o',parent);
      const data = this.getInternalData(parent);
      const index = this.segments.indexOf(data);
      const segmentElement = (this.svg.querySelector('g.segment[segments-index="'+index+'"]') as SVGGElement);
      this.simulateClick(segmentElement);
    };

    const navigate = () => {
      if(parentsB.length > 0){
        navigateUp();
      }
      else if(parentsA.length > 0){
        navigateDown();
      }
    };

    navigate();

  };

  

  protected animationFinshed: () => void;

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
      tickWidth = maxWidth / (tickCount);
      // calc value between two ticks
      tickValue = maxValue / (tickCount);
      // use maximal value to determine decimal places and factor for rounding display values
      // -> while at least one tick value with used factor is less then 1 reduce factor and enlarge decimal places
      let factor = 1; 
      decimals = 0;
      let clcTickValue = 0;
      do {
        clcTickValue = tickValue / factor;
        if(clcTickValue<1){
          factor = factor / 10;
          decimals = decimals + 1;
        }
      } while(clcTickValue < 1);
      // get rounded value between two ticks
      tickValue = Math.ceil(tickValue / factor) * factor;
      // get distance between to ticks by rounded value
      tickWidth = tickValue / maxValue  * maxWidth;
      // calculate width of maximal tick value text
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
      // if tick couldn't be displayed, stop calculation
      if(x > this.width- 1) break;
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
  protected animateTicks(direction: string, maxValue: number, endCallback: (()=>void)): void {
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
    d3.select(this.svg)
      .select('g.ticks')
      .interrupt()
      .transition()
      .duration(this.duration / this.animateDownCycles)
      .attrTween('tween-ticks', () => {
        // initialize interpolations for each element
        const interpolate = { opacity: [], x: [], value: [] };
        for(let i=0; i<this.ticks.length; ++i){
          interpolate.x[i]      = d3.interpolate(this.ticks[i].x       , ticks[i].x);
          interpolate.value[i]   = d3.interpolate(this.ticks[i].value  , ticks[i].value);
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
  protected down(item: SegmentedBarChartData): void {
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
   * first animation cyle
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
      // a segment is invisible if opacity is 0 or width is 0
      if(this.segments[i].rect.opacity===0 || this.segments[i].rect.width===0){
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
        // return y function
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
    const item = this.activeSegment;
    const parent = this.getParent(item);
    this.activeSegment = parent;
    // get reference to internal data
    const data = this.getInternalData(item);
    // store current item
    //this.activeSegment = item;
    // mark animation as active
    this.animationActive = true;
    // define finished callback
    const onFinished = () => {
      this.animationActive = false;
      if(this.animationFinshed) this.animationFinshed();
    };
    // start up animation cycle
    this.up01(item, onFinished);
  };

  //-------------------------------------------------------------------------------------------------------------------

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

  protected up01segments(item: SegmentedBarChartData, endCallback: (()=>void)): void {

    const maxValue = this.getMaxValue(this.activeSegment);
    const maxBarWidth = (this.width - this.barOffsetLeft - this.barOffsetRight);
    const factor = this.factor = ((maxBarWidth-1) / maxValue);
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
        // return y function
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

  protected up02segments(item: SegmentedBarChartData, endCallback: (()=>void)): void {
    let offsetY = this.barOffsetTop + this.barSpacing;
    const parSegments = this.getSegments(this.activeSegment);
    console.log('parSegments:%o item:%o',parSegments,item);
    for(let i=0; i<parSegments.length; ++i){
      if(parSegments[i]===item){
        break;
      }
      offsetY += this.barHeight + this.barSpacing;
    }
    let offsetX = this.barOffsetLeft;
    console.log('offsetX:%o offsetY:%o',offsetX,offsetY);
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
        offsetX += segment.rect.width;
      });
      // return y function
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

  protected up02breadcrumbs(item: SegmentedBarChartData, endCallback: (()=>void)): void {
    let offsetY = this.barOffsetTop + this.barSpacing;
    const parSegments = this.getSegments(this.activeSegment);
    for(let i=0; i<parSegments.length; ++i){
      if(parSegments[i]===item){
        break;
      }
      offsetY += this.barHeight + this.barSpacing;
    }
    let offsetX = this.barOffsetLeft;
    // move breadcrumb entry
    d3.select(this.svg)
      .select('g.breadcrumbs')
      .interrupt()
      .transition()
      .duration(this.duration / this.animateUpCycles)
      .attrTween('tween-breadcrumbs', () => {
        const interpolate = { x: [], y: [], color: [] };
        this.breadcrumbs.forEach( (breadcrumb, idx) => {
          if(idx < this.breadcrumbs.length-1){
            interpolate.x.push(null);
            interpolate.y.push(null);
            interpolate.color.push(null);
          }
          else {
            interpolate.x.push(d3.interpolate(breadcrumb.x, offsetX - this.barSpacing));
            interpolate.y.push(d3.interpolate(breadcrumb.y, offsetY + this.barHeight/2+4));
            interpolate.color.push(d3.interpolate(breadcrumb.color, breadcrumb.data.color));
          }
        });
        return (t:number): string => {
          this.breadcrumbs.forEach( (breadcrumb, idx) => {
            if(interpolate.x[idx]!==null)
              breadcrumb.x = interpolate.x[idx](t);
            if(interpolate.y[idx]!==null)
              breadcrumb.y = interpolate.y[idx](t);
            if(interpolate.color[idx]!==null)
              breadcrumb.color = interpolate.color[idx](t);
          });
          return '';
        };
      })
      // on end of animation
      .on('end', () => { endCallback(); });
  };

  //-------------------------------------------------------------------------------------------------------------------

  protected up03(item: SegmentedBarChartData, onFinished: (()=>void)): void {
    // animate segments and bars
    this.up03segments(item);
    //
    this.up04(item, onFinished);
  };

  protected up03segments(item: SegmentedBarChartData): void {
    // add segments
    let offsetY = this.barOffsetTop + this.barSpacing;
    let offsetX = this.barOffsetLeft;
    const segments = this.getSegments(this.activeSegment);
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
        // return y function
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

  protected up04breadcrumbs(item: SegmentedBarChartData, endCallback: (()=>void)): void {
    d3.select(this.svg)
      .select('g.breadcrumbs')
      .interrupt()
      .transition()
      .duration(this.duration / this.animateUpCycles)
      .attrTween('tween-breadcrumbs', () => {
        const interpolate = { x: [], y: [], color: [], opacity: [] };
        this.breadcrumbs.forEach( (breadcrumb, idx) => {
          if(idx < this.breadcrumbs.length-1){
            interpolate.opacity.push(null);
          }
          else {
            interpolate.opacity.push(d3.interpolate(breadcrumb.opacity, 0));
          }
        });
        return (t:number): string => {
          this.breadcrumbs.forEach( (breadcrumb, idx) => {
            if(interpolate.opacity[idx]!==null)
              breadcrumb.opacity = interpolate.opacity[idx](t);
          });
          return '';
        };
      })
      // on end of animation
      .on('end', () => { endCallback(); });
  };

  //*******************************************************************************************************************

}
