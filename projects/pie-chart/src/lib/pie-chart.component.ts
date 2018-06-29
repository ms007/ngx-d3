import { Component, Input, OnChanges, DoCheck, ElementRef, SimpleChanges, OnInit, Output, EventEmitter } from '@angular/core';

import * as d3 from 'd3';

/** chart item properties */
export interface PieChartData {
  /** value of item */
  value: number;
  /** caption of item (must be unique) */
  caption: string;
  /** optional color of item (if not set, generated automatically) */
  color?: string;
}

/** internal chart item properties */
export interface InternalPieChartData extends PieChartData {
  /** svg path for item */
  path?: string;
  /** delete flag for removing after transition */
  deleted?: boolean;
}

/** internal type for optimization */
export type PieArcData = d3.PieArcDatum<InternalPieChartData> & d3.DefaultArcObject;

@Component({
  selector: 'oc-pie-chart',
  templateUrl: './pie-chart-component.html',
  styleUrls: ['./pie-chart-component.css']
})
export class PieChartComponent implements OnInit, OnChanges, DoCheck {
  /** chart data, which should be displayed */
  @Input() data: Array<PieChartData> = [];
  /** chart width in pixel */
  @Input() width = 250;
  /** chart height in pixel */
  @Input() height = 250;
  /** duration of animation transition */
  @Input() duration = 1000;
  /** inner spacing in pixel, if greater than 0 it defines the radius of the empty circle in the middle */
  @Input() innerSpacing = 0;
  /** outer spacing in pixel */
  @Input() outerSpacing = 1;
  /** fired when user clicks on a chart entry */
  @Output() chartClick: EventEmitter<PieChartData> = new EventEmitter();
  /** fired when user hovers a chart entry */
  @Output() chartHover: EventEmitter<PieChartData> = new EventEmitter();

  /** pie chart radius in pixel */
  public radius: number;
  /** transform-attribute to center chart vertical and horizontal */
  public center: string;
  /** current chart data with angle and path definitions, it will be consistent to the representation */
  public curData: PieArcData[] = [];
  /** end chart data with angle and path definitions, it will representate the end state and used only for interpolation */
  private endData: PieArcData[] = [];
  /** path generator function (internal use only) */
  protected pathGenerator: d3.Arc<any, d3.DefaultArcObject>;
  /** copy of last processed data, used to identify changes in ngDoCheck that Angular overlooked */
  private lastData: Array<PieChartData> = [];

  /**
   * Creates a deep copy of an variable. Do not use this function with recursive objects or
   * browser objects like window or document.
   * ToDo: should be outsourced.
   * @param v 
   */
  protected deepCopy<T>(v: T): T {
    return JSON.parse(JSON.stringify(v));
  };

  /**
   * constructor
   * @param element 
   */
  constructor(
    private element: ElementRef
  ) {};

  ngOnInit() {
    this.tooltip = this.element.nativeElement.querySelector('div.pie-chart-tooltip') as HTMLDivElement;
  }

  /**
   * Fired when Angular (re-)sets data-bound properties. This function does not fire when changed data in bound objects or arrays.
   * Angular only checks references.
   * @param changes 
   */
  ngOnChanges(changes: SimpleChanges): void {
    // check if entries in bound data property has changed
    this.detectDataChange();
  };

  /**
   * Fired during every change detection run to detect and act upon changes that Angular can't or won't detect on its own.
   */
  ngDoCheck() {
    // check if entries in bound data property has changed
    this.detectDataChange();
  };

  /**
   * Checks whether the data property has changed. This function also check whether only an item property has
   * changed. In case of change the chart will be rendered.
   */
  protected detectDataChange() {
    // fast check: if items were added or removed
    let dataChanged = (this.data.length !== this.lastData.length);
    // detail check:
    if(dataChanged === false){
      // loop all items
      for(let idx=0; idx<this.data.length; ++idx){
        const a = this.data[idx];
        const b = this.lastData[idx];
        // check internal item properties
        dataChanged = dataChanged || (a.caption !== b.caption || a.color !== b.color || a.value !== b.value);
        // for optimization, stop if change detected
        if(dataChanged) break;
      }
    }
    // if change detected
    if(dataChanged){
      // render chart
      this.render();
      // copy current data to identify changes
      this.lastData = this.deepCopy(this.data);
    }
  };

  /**
   * Generates a random color for a chart item.
   */
  protected generateRandomColor(value: number): string {
    const hue2rgb = (p: number, q: number, t: number) => {
      if(t < 0) t += 1; 
      if(t > 1) t -= 1; 
      if(t < 1/6) return p + (q - p) * 6 * t;
      if(t < 1/2) return q;
      if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    // make sure, generated color does not exists yet in data array
    let color;
    let uniqueColorGenerated = false;
    while(uniqueColorGenerated === false){
      const h = (Math.random() + 0.618033988749895) % 1;
      const s = .5;
      const l = .6;
      let q = l + s - l * s;
      let p = 2 * l - q;
      const r = hue2rgb(p, q, h + 1/3);
      const g = hue2rgb(p, q, h);
      const b = hue2rgb(p, q, h - 1/3);
      color = '#' 
        + Math.round(r * 255).toString(16)
        + Math.round(g * 255).toString(16)
        + Math.round(b * 255).toString(16);
      uniqueColorGenerated = (this.data.map( (d) => d.color).filter( (d) => d === color).length === 0);
    }
    return color;
  };

  /**
   * generates a pie chart item definition
   * @param item 
   * @param index 
   * @param value 
   * @param startAngle 
   * @param endAngle 
   */
  protected generatePieArcData(item: PieChartData, index: number, value: number, startAngle: number, endAngle: number): PieArcData {
    // generate definition
    const result = {
      data: item,
      index: index,
      value: value,
      startAngle: startAngle,
      endAngle: endAngle,
      padAngle: 0,
      innerRadius: this.radius - 40,
      outerRadius: this.radius
    };
    // generate svg path d-attribute from definition
    (result.data as InternalPieChartData).path = this.pathGenerator(result);
    // return definition
    return result;
  };

  /**
   * Checks whether items were deleted and initiate delete transition for these items.
   */
  protected detectDeletedEntries() {
    // loop current state entries
    this.curData.forEach( (curItem, idx) => {
      // only check if current entry is not marked as deleted
      if(curItem.data.deleted!==true){
        // check if entry not exists anymore
        const isDeleted = (this.data.filter( (item) => item.caption === curItem.data.caption).length === 0);
        // if entry is deleted
        if(isDeleted){
          // mark entry in current state as deleted
          this.curData[idx].data.deleted = true;
          // mark entry in end state as deleted and set value to 0 for transtion
          this.endData[idx].data.deleted = true;
          this.endData[idx].value = 0;
        }
      }
    });
  };

  /**
   * Checks whether items were inserted and initiate insert transition for these items.
   */
  protected detectInsertedEntries(): void {
    // loop given data array
    this.data.forEach( (item, idx) => {
      // check if entry is new
      const isInserted = (this.curData.filter( (curItem) => curItem.data.deleted!==true && curItem.data.caption === item.caption).length===0);
      // if entry is new
      if(isInserted){
        // generate current state entry with value of 0 for transition
        {
          const d = this.generatePieArcData(this.deepCopy(item), idx, 0, -1, -1);
          this.curData.splice(idx, 0, d);
        }
        // generate end state entry with given value
        {
          const d = this.generatePieArcData(this.deepCopy(item), idx, item.value, -1, -1);
          this.endData.splice(idx, 0, d);
        }
      }
    });
  };

  /**
   * Checks whether items were moved and initiate transition for these items.
   */
  protected detectMovedEntries(): void {
    // separate index in current state array
    let curIndex = 0;
    // loop data array
    for(let index=0; index<this.data.length; ++index){
      // find next index in current state array, skip items marked as deleted
      while(this.curData[curIndex].data.deleted) ++curIndex; 
      // check if item is moved by comparing captions
      if(this.data[index].caption !== this.curData[curIndex].data.caption){
        // updating state items
        {
          // mark item in current state array as deleted
          this.curData[curIndex].data.deleted = true;
          // mark item in end state array as deleted and set value to 0 for transition
          this.endData[curIndex].data.deleted = true;
          this.endData[curIndex].value = 0;
        }
        // insert entry in current state array with value 0 for transition
        {
          const item = this.deepCopy(this.data[index]);
          const d = this.generatePieArcData(item, -1, 0, -1, -1);
          this.curData.splice(curIndex, 0, d);
        }
        // insert entry in end state array with given value
        {
          const item = this.deepCopy(this.data[index]);
          const d = this.generatePieArcData(item, -1, item.value, -1, -1);
          this.endData.splice(curIndex, 0, d);
        }
        // because of inserting item to the array's, increment index twice
        ++curIndex;
      }
      ++curIndex;
    }
  };

  /**
   * Synchronize state arrays (curData / endData) with given items (data).
   */
  protected syncItems(): void {
    // sync values and colors
    this.data.forEach( (item, index) => {
      // find item index in state array's
      let curIndex = 0;
      for(let i=0; i<this.curData.length; ++i){
        if(!this.curData[i].data.deleted && this.curData[i].data.caption === item.caption){
          curIndex = i;
          break;
        }
      }
      // update value in state entries
      this.curData[curIndex].data.value = item.value;
      this.endData[curIndex].data.value = item.value;
      // update value in end state entry for transition
      this.endData[curIndex].value = item.value;
      // update color in end state entry for transition
      this.endData[curIndex].data.color = item.color;
    });
  };

  /**
   * Function for interrupt a running chart animation. Necessary because if transition is still active
   * when a new transition is started, tween factory function from previos transition will still be fired 
   * until end of transition is reached. For entries which have a started transition the tween factory
   * function will be fired multiple times with different tween interpolation range!
   */
  protected interrupt: Function = undefined;

  /**
   * will be triggerd to animate chart changes.
   * important! this method musst be called within a setTimeout function because of angulars 
   * rendering cycle.
   */
  protected animateChanges(): void {
    // get svg element reference
    const svg = (this.element.nativeElement.querySelector('svg') as SVGElement);
    // reference all path elements in svg element
    const paths = d3.select(svg).selectAll('path');
    // define interruption function to stop running animations
    this.interrupt = () => {
      // call paths interrupt method
      paths.interrupt();
      // delete interupt definition
      delete this.interrupt;
    };
    // start path animation
    paths
      .transition()
      .duration(this.duration)
      // Use d3 attrTween transition method with dummy attribute. Make sure the dummy attribute does not
      // exists at path elements!
      .attrTween('pie-tween-dummy', (arg0, idx, nodeList) => {
        // create interpolation functions to calculate step values
        const iValue = d3.interpolate(this.curData[idx].value, this.endData[idx].value);
        const iStartAngle = d3.interpolate(this.curData[idx].startAngle, this.endData[idx].startAngle);
        const iEndAngle = d3.interpolate(this.curData[idx].endAngle, this.endData[idx].endAngle);
        const iColor = d3.interpolate(this.curData[idx].data.color, this.endData[idx].data.color);
        // return factory function for animation steps
        return (t) => {
          // interpolate values by given transition value
          this.curData[idx].value = iValue(t);
          this.curData[idx].startAngle = iStartAngle(t);
          this.curData[idx].endAngle = iEndAngle(t);
          this.curData[idx].data.color = iColor(t);
          // generate new path
          this.curData[idx].data.path = this.pathGenerator(this.curData[idx]);
          // return empty string. This is only necessary for typescript compiler. Nothing should be changed here.
          return '';
        };
      })
      // when transition is complete
      .on('end', (arg0, idx, nodeList) => {
        // when transition is complete for the last item
        if(idx===nodeList.length-1){
          // remove as deleted marked entries
          this.cleanStateItems();
          // Delete interupt definition, because everything has finished and nothing can be interrupted.
          delete this.interrupt;
        }
      });
  };

  /**
   * Must be called after transition ends to remove entries in curData and endData which are marked
   * as deleted.
   */
  protected cleanStateItems(): void {
    // clean current state array
    for(let i=this.curData.length-1; i>=0; --i){
      if(this.curData[i].data.deleted===true){
        this.curData.splice(i, 1);
      }
    }
    // clean end state array
    for(let i=this.endData.length-1; i>=0; --i){
      if(this.endData[i].data.deleted===true){
        this.endData.splice(i,1);
      }
    }
  };

  /**
   * Checks whether all items have assigned color values and if necessary completes colors in given data array.
   */
  protected initColors(): void {
    // loop all entries
    this.data.forEach( (item) => {
      // if no color is assigned
      if(!item.color){
        // generate random color for item
        item.color = this.generateRandomColor(item.value);
      }
    });
  };

  /**
   * Returns maximal angle of current state items.
   */
  protected getMaxAngle(): number {
    let maxAngle = 0;
    this.curData.forEach( (curItem) => { 
      if(curItem.endAngle > maxAngle){
        maxAngle = curItem.endAngle;
      }
    });
    return maxAngle;
  };

  /**
   * Calculates angles for current and end state items.
   * @param maxAngle last maximal angle in current state to avoid "jumping" transitions
   */
  protected calculateAngles(maxAngle: number): void {
    // calculate angles for current state items
    {
      // calculate sum of values
      const total = this.curData.reduce((p, c) => p + c.value, 0);
      // loop items and calculate start and end angles, initialize rendering
      let lastAngle = 0;
      this.curData.forEach( (item, idx) => {
        // calculate angles by last used maximal angle. without data (total=0) simulate 0 values, so draw items in clockwise direction.
        const nextAngle = lastAngle + ((maxAngle) / ((total===0)?1:total)) * item.value;
        item.startAngle = lastAngle;
        item.endAngle = nextAngle;
        item.index = idx;
        item.data.path = this.pathGenerator(item);
        lastAngle = nextAngle;
      });
    }
    // calculate angles for end state items
    {
      // calculate sum of values
      const total = this.endData.reduce((p, c) => p + c.value, 0);
      // loop items and calculate start and end angles, initialize rendering
      let lastAngle = 0;
      this.endData.forEach( (item, idx) => {
        // calculate angles with circumference. without data (total=0) simulate 0 values, so draw items in anti-clockwise direction.
        const nextAngle = lastAngle + ((2 * Math.PI) / ((total===0)?1:total)) * item.value;
        item.startAngle = lastAngle;
        item.endAngle = nextAngle;
        item.index = idx;
        item.data.path = this.pathGenerator(item);
        lastAngle = nextAngle;
      });
    }
  };

  /** reference to tooltip div element */
  private tooltip: HTMLDivElement;

  /**
   * fired when mouse enters a pie chart path element and shows tooltip
   * @param event 
   */
  public overPath(event: MouseEvent){
    // get tooltip-text of path element
    const txt = (event.target as SVGPathElement).getAttribute('tooltip');
    // show tooltip and assign text
    d3.select(this.tooltip)
      .html(txt)
      .style('display', 'block')
      .transition()
      .duration(250)
      .style('opacity', 1);

    // get index
    const idx = parseInt((event.target as SVGPathElement).getAttribute('idx'),10);
    // get caption of element
    const caption = this.curData[idx].data.caption;
    // get original data by caption
    const item = this.data.filter( (d) => d.caption === caption)[0];
    // if data found then emit chart click event
    if(item){
      this.chartHover.emit(item);
    }
  };

  /**
   * fired when mouse moves over a pie chart path element and adjusts tooltip
   * @param event 
   */
  public movePath(event: MouseEvent){
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
   * fired when mouse leaves a pie chart path element and hides tooltip
   * @param event 
   */
  public outPath(event: MouseEvent){
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
   * fired when user clicks on a pie chart path element
   * @param event 
   */
  public clickPath(event: MouseEvent){
    // get index
    const idx = parseInt((event.target as SVGPathElement).getAttribute('idx'),10);
    // get caption of element
    const caption = this.curData[idx].data.caption;
    // get original data by caption
    const item = this.data.filter( (d) => d.caption === caption)[0];
    // if data found then emit chart click event
    if(item){
      this.chartClick.emit(item);
    }
  };

  /**
   * main rendering function
   */
  protected render(): void{
    // interrupt possible running animations
    if(this.interrupt) this.interrupt();
    // initialize chart colors
    this.initColors();
    // calculate radius
    this.radius = Math.min(this.width, this.height) / 2;
    // calculate middle of chart
    this.center = `translate(${this.width / 2}, ${this.height / 2})`;
    // create path generator
    this.pathGenerator = d3.arc().outerRadius(this.radius-this.outerSpacing).innerRadius(this.innerSpacing);
    // get current maximal angle, necessary to avoid "jumping" transitions
    const maxAngle = this.getMaxAngle();
    // check data array for deleted entries and assign transition configuration
    this.detectDeletedEntries();
    // check data array for inserted entries and assign transition configuration
    this.detectInsertedEntries();
    // check data array for moved entries and assign transition configuration
    this.detectMovedEntries();
    // synchronize data entries with current and end state entries
    this.syncItems();
    // calculate angles for current and end state entries
    this.calculateAngles(maxAngle);
    // important! use setTimeout because angular first must exec change detection
    setTimeout( () => {
      // start change animations
      this.animateChanges();
    }, 0);
  };

  /*
  private version1(): void {
    const sum = this.data.reduce((p, c) => p + c.value, 0);
    let lastAngle = 0;
    this.data.forEach(d => {
      const newAngle = lastAngle + ((2 * Math.PI) / sum) * d.value;
      const context = path();
      context.moveTo(0, 0);
      context.arc(0, 0, this.radius, lastAngle, newAngle, false);
      d.path = context.toString();
      console.log(d.path);
      lastAngle = newAngle;
    });
  }
  */
}
