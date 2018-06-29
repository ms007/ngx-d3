import { Component, OnInit, Input, SimpleChanges, ElementRef, Output, EventEmitter } from '@angular/core';

import * as d3 from 'd3';

/** chart item properties */
export interface BubbleChartData {
  /** value of item */
  value: number;
  /** caption of item (must be unique) */
  caption: string;
  /** optional color of item (if not set, generated automatically) */
  color?: string;
  /** optional image path of item */
  imagePath?: string;
}

/** internal chart item properties */
export interface InternalBubbleChartData {
  /** name of item (d3js) = caption */
  name: string;
  /** size of item (d3js) = value */
  size: number;
  /** color of item */
  color: string;
  /** optional image path of item */
  imagePath?: string;
  /** should item be deleted after transition ends */
  deleted?: boolean;
  /** font size for item */
  fontSize?: number;
  /** is true, if image path is set */
  showImage?: boolean;
}

/** d3.js bubble chart leaf properties */
export interface BubbleChartLeaf {
  /** data reference */
  data: InternalBubbleChartData;
  /** depth, not used */
  depth: number;
  /** height, not used */
  height: number;
  /** parent node, not used */
  parent: BubbleChartLeaf;
  /** raduis in pixel */
  r: number;
  /** value of item */
  value: number;
  /** x-position in pixel */
  x: number;
  /** y-position in pixel */
  y: number;
}

@Component({
  selector: 'oc-bubble-chart',
  templateUrl: './bubble-chart.component.html',
  styleUrls: ['./bubble-chart.component.css']
})
export class BubbleChartComponent implements OnInit {
  /** chart data, which should be displayed */
  @Input() data: BubbleChartData[] = [];
  /** chart width in pixel */
  @Input() width = 500;
  /** chart height in pixel */
  @Input() height = 500;
  /** duration of animation transition */
  @Input() duration = 1000;
  /** fired when user clicks on a chart entry */
  @Output() chartClick: EventEmitter<BubbleChartData> = new EventEmitter();
  /** fired when user hovers a chart entry */
  @Output() chartHover: EventEmitter<BubbleChartData> = new EventEmitter();

  /** current chart data with angle and path definitions, it will be consistent to the representation */
  public curData: BubbleChartLeaf[] = [];
  /** end chart data with angle and path definitions, it will representate the end state and used only for interpolation */
  private endData: BubbleChartLeaf[] = [];
  /** copy of last processed data, used to identify changes in ngDoCheck that Angular overlooked */
  protected lastData: BubbleChartData[] = [];
  /** last processed width, used to identify changes */
  protected lastWidth: number = 0;
  /** last processed height, used to identify changes */
  protected lastHeight: number = 0;
  /** initialized flag, if true dom elements are available */
  protected initialized = false;
  /** reference to the dom svg element */
  protected svg: SVGElement;
  /** reference to tooltip div element */
  private tooltip: HTMLDivElement;

  constructor(
    private element: ElementRef
  ) {}

  /**
   * Fired whan Angular has initialized this component
   */
  ngOnInit() {
    // get svg element reference
    this.svg = (this.element.nativeElement.querySelector('svg') as SVGElement);
    // get tooltip element reference
    this.tooltip = (this.element.nativeElement.querySelector('div.bubble-chart-tooltip') as HTMLDivElement);
    // mark component as initialized
    this.initialized = true;
  };

  /**
   * Fired when Angular (re-)sets data-bound properties. This function does not fire when changed data in bound objects or arrays.
   * Angular only checks references.
   * @param changes 
   */
  ngOnChanges(changes: SimpleChanges): void {
    // make sure component is initialized
    if(!this.initialized) return ;
    // check if entries in bound data property has changed
    this.detectDataChange();
  };

  /**
   * Fired during every change detection run to detect and act upon changes that Angular can't or won't detect on its own.
   */
  ngDoCheck() {
    // make sure component is initialized
    if(!this.initialized) return ;
    // check if entries in bound data property has changed
    this.detectDataChange();
  };

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
   * Checks whether the data property or dimensions has changed. This function also check whether only an
   * item property has changed. In case of change the chart will be rendered.
   */
  protected detectDataChange() {
    // fast check: if chart was resized
    let dataChanged = (this.height !== this.lastHeight) || (this.width !== this.lastWidth);
    // fast check: if items were added or removed
    dataChanged = dataChanged || (this.data.length !== this.lastData.length);
    // detail check:
    if(dataChanged === false){
      // loop all items
      for(let idx=0; idx<this.data.length; ++idx){
        const a = this.data[idx];
        const b = this.lastData[idx];
        // check internal item properties
        dataChanged = dataChanged || (a.caption !== b.caption || a.color !== b.color || a.value !== b.value || a.imagePath !== b.imagePath);
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
      // store last dimensions
      this.lastHeight = this.height;
      this.lastWidth = this.width;
    }
  };

  /**
   * Converts d3.js leaf data item in a bubble data item.
   * @param leafData 
   */
  protected leafDataToBubbleData(leafData: InternalBubbleChartData): BubbleChartData {
    return {
      caption: leafData.name,
      value: leafData.size,
      color: leafData.color,
      imagePath: leafData.imagePath
    };
  };

  /**
   * Converts a bubble data item in a d3.js leaf data item.
   * @param bubbleData 
   */
  protected bubbleDataToLeafData(bubbleData: BubbleChartData): InternalBubbleChartData {
    return {
      name: bubbleData.caption,
      size: bubbleData.value,
      color: bubbleData.color,
      imagePath: bubbleData.imagePath,
      showImage: !!(bubbleData.imagePath)
    };
  };

  /**
   * Creates a usable bubble item from d3.js leaf definition.
   * @param leaf 
   */
  protected copyLeaf(leaf: d3.HierarchyCircularNode<InternalBubbleChartData>): BubbleChartLeaf {
    // generate definition
    const result: BubbleChartLeaf = {
      data: leaf.data,
      depth: leaf.depth,
      height: leaf.height,
      parent: null,
      r: leaf.r,
      value: leaf.value,
      x: leaf.x,
      y: leaf.y
    };
    // return definition
    return result;
  };

  /**
   * generates a bubble data item from given values
   * @param item reference to data item
   * @param value value of item
   * @param r radius of item
   * @param x x position of item
   * @param y y position of item
   */
  protected generateLeaf(item: BubbleChartData, value: number, r: number, x: number, y: number): BubbleChartLeaf {
    // generate definition
    const result: BubbleChartLeaf = {
      data: this.bubbleDataToLeafData(item),
      depth: 1,
      height: 0,
      parent: null,
      r: r,
      value: value,
      x: x,
      y: y
    };
    // return definition
    return result;
  };

  /**
   * Creates d3.js dataset from given data.
   * @param data 
   */
  protected generateDataset(data: BubbleChartData[]): any {
    const dataset = [];
    data.forEach( (item) => {
      dataset.push(this.bubbleDataToLeafData(item));
    });
    return { children: dataset };
  };

  /**
   * Generates d3.js leaves from given data
   */
  protected generateLeaves(): d3.HierarchyCircularNode<InternalBubbleChartData>[] {
    // generate chart positions
    const dataset = this.generateDataset(this.data);
    const pack = d3.pack().size([this.width, this.height]).padding(5);
    const root = d3.hierarchy(dataset).sum( (d) => d.size );
    let leaves = ((pack(root).leaves() as d3.HierarchyCircularNode<InternalBubbleChartData>[]));
    // important! if an empty array is given, d3.js creates an empty node with invalid calculation
    if(leaves.length===1 && isNaN(leaves[0].r)){
      leaves = [];
    }
    return leaves;
  };

  /**
   * Checks whether entries were deleted. For these items transition will be initiated.
   * @param leaves 
   */
  protected detectDeletedEntries(leaves: d3.HierarchyCircularNode<InternalBubbleChartData>[]): void {
    this.curData.forEach( (item, index) => {
      if(item.data.deleted!==true){
        // check if deleted
        const isDeleted = (leaves.filter( (leaf) => leaf.data.name===item.data.name ).length === 0);
        if(isDeleted){
          // mark current item as deleted
          {
            this.curData[index].data.deleted = true;
          }
          // set end item as deleted and set value 0
          {
            this.endData[index].data.deleted = true;
            this.endData[index].r = 0;
            this.endData[index].value = 0;
            this.endData[index].data.fontSize = 0;
          }
        }
      }
    });
  };

  /**
   * Checks wheter entries were inserted. For these items transition will be initiated.
   * @param leaves 
   */
  protected detectInsertedEntries(leaves: d3.HierarchyCircularNode<InternalBubbleChartData>[]): void {
    leaves.forEach( (leaf, idx) => {
      // check if inserted
      const isInserted = ((this.endData.filter( (endItem) => endItem.data.deleted !== true && endItem.data.name === leaf.data.name)).length === 0);
      if(isInserted){
        // add item to current state with 0
        {
          const curItem = this.generateLeaf( this.leafDataToBubbleData(leaf.data), 0, 0, leaf.x, leaf.y );
          curItem.data.fontSize = 0;
          this.curData.splice(idx, 0, curItem);
        }
        // add item to end state with value
        {
          const endItem = this.copyLeaf(leaf);
          this.endData.splice(idx, 0, endItem);
        }
      }
    });
  };

  /**
   * synchronizes given data with current and end states
   */
  protected syncData(): void {
    // generate bubble chart leaves
    const leaves = this.generateLeaves();
    // detect deleted entries
    this.detectDeletedEntries(leaves);
    // detect inserted entries
    this.detectInsertedEntries(leaves);
    // detect changes in data or position / dimension
    leaves.forEach( (leaf, idx) => {
      // search for item
      const endItem = this.endData.filter( (item) => item.data.deleted !== true && item.data.name === leaf.data.name)[0];
      // synchronize data
      endItem.data.color = leaf.data.color;
      endItem.data.size = leaf.data.size;
      endItem.data.imagePath = leaf.data.imagePath;
      // synchronize position and dimension
      endItem.r = leaf.r;
      endItem.x = leaf.x;
      endItem.y = leaf.y;
      endItem.value = leaf.value;
      // synchronize image path also for current state item, because image changes are not animated
      const curItem = this.curData.filter( (item) => item.data.name === leaf.data.name)[0];
      curItem.data.imagePath = leaf.data.imagePath;
    });
  };

  /**
   * calculate font sizes for all items to fit in bubble
   */
  protected calcFontSizes(): void {
    // get reference to text measure dummy element
    const elem = this.svg.querySelector('.text-measure') as SVGTextElement;
    // loop all data
    this.endData.forEach( (item, idx) => {
      // assign text to dummy element
      elem.textContent = item.data.name;
      // calculate metrics of text
      const box = elem.getBBox();
      const textHeight = box.height;
      const textWidth = box.width;
      // make sure, text width fit in bubble
      let maxWidth = (item.r) * 2;
      if(maxWidth > item.r*.05) maxWidth -= item.r*.2;
      // if image is assigned, make sure text fit in bubble when below image
      if(item.data.showImage){
        maxWidth -= (maxWidth * .4);
      }
      // calculate text scale
      let scale = maxWidth / textWidth;
      // make sure text height fit in bubble
      if((textHeight*scale) > item.r*3/8){
        scale = item.r*3/8 / textHeight;
      }
      // assign font size for item
      item.data.fontSize = (24 * scale);
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
   * main rendering function
   */
  protected render(): void {
    // interrupt possible running animations
    if(this.interrupt) this.interrupt();
    // initialize chart colors
    this.initColors();
    // synchronize data
    this.syncData();
    // calculate font sizes
    this.calcFontSizes();
    // important! use setTimeout because angular first must exec change detection
    setTimeout( () => {
      // start change animations
      this.animateChanges();
    }, 0);
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
   * will be triggerd to animate chart changes.
   * important! this method musst be called within a setTimeout function because of angulars 
   * rendering cycle.
   */
  protected animateChanges(): void {
    // select all svg g elements
    const g = d3.select(this.svg).selectAll('g');
    // define interruption function to stop running animations
    this.interrupt = () => {
      // call paths interrupt method
      g.interrupt();
      // delete interupt definition
      delete this.interrupt;
    };
    // start transition
    g.transition()
      .duration(this.duration)
      .attrTween('bubble-tween-dummy', (arg0, idx, nodeList) => {
        const iX = d3.interpolate(this.curData[idx].x, this.endData[idx].x);
        const iY = d3.interpolate(this.curData[idx].y, this.endData[idx].y);
        const iR = d3.interpolate(this.curData[idx].r, this.endData[idx].r);
        const iColor = d3.interpolate(this.curData[idx].data.color, this.endData[idx].data.color);
        const iFontSize = d3.interpolate(this.curData[idx].data.fontSize, this.endData[idx].data.fontSize);
        return (t) => {
          this.curData[idx].x = iX(t);
          this.curData[idx].y = iY(t);
          this.curData[idx].r = iR(t);
          this.curData[idx].data.color = iColor(t);
          this.curData[idx].data.fontSize = iFontSize(t);
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

  protected findBubble(element: Element): SVGGElement {
    // make sure to have a g element as target
    while(element.nodeName !== 'g'){ element = (element.parentElement as Element); }
    return (element as SVGGElement);
  }

  /**
   * fired when mouse enters a bubble element and shows tooltip
   * @param event 
   */
  public overBubble(event: MouseEvent){
    // make sure to have a g element as target
    const target = this.findBubble(event.target as Element);
    // get tooltip-text of path element
    const txt = target.getAttribute('tooltip');
    // show tooltip and assign text
    d3.select(this.tooltip)
      .html(txt)
      .style('display', 'block')
      .transition()
      .duration(250)
      .style('opacity', 1);
    // get index
    const idx = parseInt(target.getAttribute('idx'),10);
    // get caption of element
    const caption = this.curData[idx].data.name;
    // get original data by caption
    const item = this.data.filter( (d) => d.caption === caption)[0];
    // if data found then emit chart click event
    if(item){
      this.chartHover.emit(item);
    }
  };

  /**
   * fired when mouse moves over a bubble element and adjusts tooltip
   * @param event 
   */
  public moveBubble(event: MouseEvent){
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
   * fired when mouse leaves a bubble element and hides tooltip
   * @param event 
   */
  public outBubble(event: MouseEvent){
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
  public clickBubble(event: MouseEvent){
    // make sure to have a g element as target
    const target = this.findBubble(event.target as Element);
    // get index
    const idx = parseInt(target.getAttribute('idx'),10);
    // get caption of element
    const caption = this.curData[idx].data.name;
    // get original data by caption
    const item = this.data.filter( (d) => d.caption === caption)[0];
    // if data found then emit chart click event
    if(item){
      this.chartClick.emit(item);
    }
  };

}
