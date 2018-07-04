import { Component, OnInit, Input, ElementRef, INJECTOR } from '@angular/core';

import * as d3 from 'd3';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';

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

interface InternalSegmentedBarChartData  {
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

interface AxisX {
  value: number;
  x: number;
  opacity: number;
}

@Component({
  selector: 'oc-segmented-bar-chart',
  templateUrl: './segmented-bar-chart.component.html',
  styleUrls: ['./segmented-bar-chart.component.css']
})
export class SegmentedBarChartComponent implements OnInit {

  @Input() data: SegmentedBarChartData[] = [];

  @Input() width: number = 600;
  @Input() height: number = 400;

  constructor(
    private element: ElementRef,
    private sanitizer: DomSanitizer
  ) { }

  public svg: SVGElement;

  ngOnInit() {
    this.svg = (this.element.nativeElement as HTMLElement).querySelector('svg');

    console.log(this.data);
    this.initialize();
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

  public barHeight: number = 20;
  public barSpacing: number = 5;
  public barOffsetTop: number = 25;
  public barOffsetLeft: number = 100;
  public barOffsetRight: number = 0;
  public segments: InternalSegmentedBarChartData[] = [];
  public activeSegment: SegmentedBarChartData = null;
  public tickCount: number = 1;
  public ticks: {value: number, x: number}[] = [];

  public factor: number = 1;

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

    this.initOffsetLeft();

    const maxValue = this.getMaxValue();
    const maxBarWidth = (this.width - this.barOffsetLeft - this.barOffsetRight);
    const factor = this.factor = ((maxBarWidth-1) / maxValue);

    this.segments = [];
    let offsetY = this.barOffsetTop + this.barSpacing;

    this.data.forEach( (data) => {
      const value = this.getValue(data);
      const segment: InternalSegmentedBarChartData = {
        data: data,
        parent: null,
        value: value,
        color: data.color,
        rect: {
          x: this.barOffsetLeft,
          y: offsetY,
          width: value * factor,
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

    const barWidth = this.width - this.barOffsetLeft - this.barOffsetRight - 1;
    const maxTickCount = 10;
    const tickValue = maxValue / maxTickCount;
    const tickWidth = barWidth / maxTickCount;
    console.log('barWidth:%o maxTickCount:%o maxValue:%o tickValue:%o tickWidth:%o',barWidth,maxTickCount,maxValue,tickValue,tickWidth);
    this.ticks = [];
    let offsetValue = 0;
    let offsetX = this.barOffsetLeft;
    for(let i=0; i<=maxTickCount; ++i){
      this.ticks.push({
        value: Math.round(offsetValue),
        x: Math.round(offsetX)
      });
      offsetValue += tickValue;
      offsetX += tickWidth;
    }


  };

  protected goDown(parent: InternalSegmentedBarChartData): void {
    console.log('goDown parent:%o',parent);
    this.activeSegment = parent.data;
    this.goDown01(parent);
  };

  protected goDown01(parent: InternalSegmentedBarChartData): void {
    // add segments
    let offsetY = this.barOffsetTop + this.barSpacing;
    let offsetX = this.barOffsetLeft;
    const segments = this.getSegments(parent.data);
    segments.forEach( (data) => {
      const value = this.getValue(data);
      const segment: InternalSegmentedBarChartData = {
        data: data,
        parent: parent.data,
        value: value,
        color: data.color,
        rect: {
          x: offsetX,
          y: parent.rect.y,
          width: value * this.factor,
          height: this.barHeight,
          opacity: 0
        },
        text: {
          x: this.barOffsetLeft - this.barSpacing,
          y: offsetY + this.barHeight/2+4,
          opacity: 0
        }
      };
      offsetX += segment.rect.width;
      offsetY += segment.rect.height + this.barSpacing;
      this.segments.push(segment);
    });

    this.goDown02(parent);
  };

  protected goDown02(parent: InternalSegmentedBarChartData): void {
    d3.select(this.svg)
      .select('g.segments')
      .interrupt()
      .transition()
      .duration(1000)
      .attrTween('tween-segments', () => {
        // initialize interpolations for each element
        const interpolate = { rect: { opacity: [], width: [] }, text: { opacity: [] } };
        this.segments.forEach( (segment, idx) => {
          // a) segment is a child
          if(segment.parent === parent.data){
            // show bar by opacity
            interpolate.rect.opacity[idx] = d3.interpolate(segment.rect.opacity, 1);
          }
          // b) segment is the parent
          else if(segment === parent){
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
            if(interpolate.rect.opacity[idx])
              segment.rect.opacity = interpolate.rect.opacity[idx](t);
            if(interpolate.rect.width[idx])
              segment.rect.width = interpolate.rect.width[idx](t);
            if(interpolate.text.opacity[idx])
              segment.text.opacity = interpolate.text.opacity[idx](t);
          });
          return '';
        }
      })
      .on('end', () => { this.goDown03(parent); });
  };

  protected goDown03(parent: InternalSegmentedBarChartData): void {
    // first delete all invisible entries
    for(let i=this.segments.length-1; i>=0; --i){
      if(this.segments[i].rect.opacity===0 || this.segments[i].rect.x >= this.width || this.segments[i].rect.width===0){
        this.segments.splice(i,1);
      }
    }
    // second move all visible entries to new positions
    d3.select(this.svg)
    .select('g.segments')
    .interrupt()
    .transition()
    .duration(1000)
    .attrTween('tween-segments', () => {
      // initialize interpolations for each element
      const interpolate = { x: [], y: [] };
      let offsetY = this.barOffsetTop + this.barSpacing;
      this.segments.forEach( (segment, idx) => {
        interpolate.x.push(d3.interpolate(segment.rect.x, this.barOffsetLeft));
        interpolate.y.push(d3.interpolate(segment.rect.y, offsetY));
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
    .on('end', () => { this.goDown04(parent); });
  };

  protected goDown04(parent: InternalSegmentedBarChartData): void {
    // rescale 
    const maxValue = this.getMaxValue(parent.data);
    const maxBarWidth = (this.width - this.barOffsetLeft - this.barOffsetRight);
    const factor = this.factor = ((maxBarWidth-1) / maxValue);
    d3.select(this.svg)
      .select('g.segments')
      .interrupt()
      .transition()
      .duration(1000)
      .attrTween('tween-segments', () => {
        // initialize interpolations for each element
        const interpolate = { rect: { width: [] }, text: { opacity: [] } };
        this.segments.forEach( (segment, idx) => {
          // resize bar width
          interpolate.rect.width[idx] = d3.interpolate(segment.rect.width, segment.value * factor);
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
      });

    // todo: rescale x axis!!
    const maxTickCount = 10;
    const tickValue = maxValue / maxTickCount;

    d3.select(this.svg)
      .select('g.ticks')
      .interrupt()
      .transition()
      .duration(1000)
      .attrTween('tween-ticks', () => {
        // initialize interpolations for each element
        const iValue = [];
        let offsetValue = 0;
        this.ticks.forEach( (tick, idx) => {
          iValue.push(d3.interpolate(tick.value, Math.round(offsetValue)));
          offsetValue += tickValue;
        });
        // return factory function
        return (t: number): string => {
          // during animation assign new properties
          this.ticks.forEach( (tick, idx) => {
            tick.value =  Math.round(iValue[idx](t));
          });
          return '';
        }
      });
  };

  protected goUp(): void {
    console.log('goUp activeSegment:%o', this.activeSegment);

    // rescale
    const segment = this.activeSegment;
    const parent = this.getParent(this.activeSegment);
    this.activeSegment = parent;
    const maxValue = this.getMaxValue(parent);
    const maxBarWidth = (this.width - this.barOffsetLeft - this.barOffsetRight);
    const factor = this.factor = ((maxBarWidth-1) / maxValue);
    d3.select(this.svg)
      .select('g.segments')
      .interrupt()
      .transition()
      .duration(1000)
      .attrTween('tween-segments', () => {
        // initialize interpolations for each element
        const interpolate = { rect: { width: [] }, text: { opacity: [] } };
        this.segments.forEach( (seg, idx) => {
          interpolate.rect.width[idx] = d3.interpolate(seg.rect.width, seg.value * factor);
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
      .on('end', () => { this.goUp02(segment, parent); });
    // todo: rescale x axis!!!
    const maxTickCount = 10;
    const tickValue = maxValue / maxTickCount;

    d3.select(this.svg)
      .select('g.ticks')
      .interrupt()
      .transition()
      .duration(1000)
      .attrTween('tween-ticks', () => {
        // initialize interpolations for each element
        const iValue = [];
        let offsetValue = 0;
        this.ticks.forEach( (tick, idx) => {
          iValue.push(d3.interpolate(tick.value, Math.round(offsetValue)));
          offsetValue += tickValue;
        });
        // return factory function
        return (t: number): string => {
          // during animation assign new properties
          this.ticks.forEach( (tick, idx) => {
            tick.value =  Math.round(iValue[idx](t));
          });
          return '';
        }
      });
  };

  protected goUp02(segment: SegmentedBarChartData, parent: SegmentedBarChartData): void {
    console.log(segment);
    // second move all visible entries to new positions
    d3.select(this.svg)
      .select('g.segments')
      .interrupt()
      .transition()
      .duration(1000)
      .attrTween('tween-segments', () => {
        // initialize interpolations for each element
        const interpolate = { x: [], y: [] };
        let offsetY = this.barOffsetTop + this.barSpacing;
        const parSegments = this.getSegments(parent);
        for(let i=0; i<parSegments.length; ++i){
          if(parSegments[i]===segment){
            break;
          }
          offsetY += this.barHeight + this.barSpacing;
        }
        let offsetX = this.barOffsetLeft;
        this.segments.forEach( (segment, idx) => {
          interpolate.x.push(d3.interpolate(segment.rect.x, offsetX));
          interpolate.y.push(d3.interpolate(segment.rect.y, offsetY));
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
      .on('end', () => { this.goUp03(segment, parent); });
  };

  protected goUp03(segment: SegmentedBarChartData, parent: SegmentedBarChartData): void {
    // add segments
    let offsetY = this.barOffsetTop + this.barSpacing;
    let offsetX = this.barOffsetLeft;
    const segments = this.getSegments(parent);
    segments.forEach( (data, idx) => {
      const value = this.getValue(data);
      const segment: InternalSegmentedBarChartData = {
        data: data,
        parent: parent,
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
    d3.select(this.svg)
      .select('g.segments')
      .interrupt()
      .transition()
      .duration(1000)
      .attrTween('tween-segments', () => {
        // initialize interpolations for each element
        const interpolate = { rect: { opacity: [], width: [] }, text: { opacity: [] } };
        this.segments.forEach( (seg, idx) => {
          // a) segment is the parent
          if(seg.data === parent){
            // show bar by opacity
            interpolate.rect.opacity[idx] = d3.interpolate(seg.rect.opacity, 1);
          }
          // b) segment is on the parent level
          else if(seg.parent === parent){
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
        for(let i=this.segments.length-1; i>=0; --i){
          if(this.segments[i].parent!==parent){
            this.segments.splice(i, 1);
          }
        }
      });
  }



  protected clickedSegment(segment: InternalSegmentedBarChartData){
    console.log('clickedSegment segment:%o',segment);
    if(segment.data.segments && segment.data.segments.length>0){
      this.goDown(segment);
    }
  }
  protected clickedChart(event: MouseEvent): void {
    console.log('clickedChart event:%o', event);
    if(this.activeSegment !== null){
      this.goUp();
    }
  }


}
