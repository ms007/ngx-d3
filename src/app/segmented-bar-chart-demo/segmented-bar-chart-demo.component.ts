import { Component, OnInit } from '@angular/core';
import { SegmentedBarChartData } from 'projects/segmented-bar-chart/src/public_api';

@Component({
  selector: 'app-segmented-bar-chart-demo',
  templateUrl: './segmented-bar-chart-demo.component.html',
  styleUrls: ['./segmented-bar-chart-demo.component.css']
})
export class SegmentedBarChartDemoComponent implements OnInit {

  public data: SegmentedBarChartData[] = [];

  constructor() { }


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
      uniqueColorGenerated = true;
      //uniqueColorGenerated = (this.data.map( (d) => d.color).filter( (d) => d === color).length === 0);
    }
    return color;
  };

  /**
   * returns random number between min and max
   * @param min 
   * @param max 
   */
  private randomInt(min: number, max: number): number {
    return min + Math.floor(Math.random() * (max - min));
  };

  ngOnInit() {

    const colors: string[][] = [];

    for(let l=0; l<20; ++l){
      colors[l] = [];
      for(let i=0; i<20; ++i){
        colors[l][i] = this.generateRandomColor(0);
      }
    }

    this.data = [];

    for(let i=0; i<10; ++i){
      const I: SegmentedBarChartData = { caption: 'Item #'+i, color: colors[0][i], segments: [] };
      this.data.push(I);
      for(let j=0; j<5; ++j){
        const J: SegmentedBarChartData = { caption: 'Item #'+i+'/'+j, color: colors[1][j], segments: [] };
        I.segments.push(J);
        for(let k=0; k<5; ++k){
          const K: SegmentedBarChartData = { caption: 'Item #'+i+'/'+j+'/'+k, color: colors[2][k], segments: [] };
          J.segments.push(K);
          for(let l=0; l<5; ++l){
            const L: SegmentedBarChartData = { caption: 'Item #'+i+'/'+j+'/'+k+'/'+l, color: colors[3][l], segments: [] };
            K.segments.push(L);
            for(let m=0; m<5; ++m){
              const M: SegmentedBarChartData = { caption: 'Item #'+i+'/'+j+'/'+k+'/'+l+'/'+m, color: colors[4][m], value: this.randomInt(1,100) };
              L.segments.push(M);
            }
          }
        }
      }
    }


    /*const segColors: string[] = [
      '#747474',
      '#563D7C',
      '#293949',
      '#3DB7C4'
    ];

    this.data = [
      { caption: 'Angular', color: '#DD0031', value: 100,
        segments: [
          { caption: 'SEG-01', color: segColors[0], value: 25 },
          { caption: 'SEG-02', color: segColors[1], value: 25 },
          { caption: 'SEG-03', color: segColors[2], value: 25 },
          { caption: 'SEG-04', color: segColors[3], value: 25 }
        ]
      },
      { caption: 'Vue.js', color: '#4DBA87', value: 90,
        segments: [
          { caption: 'SEG-01', color: segColors[0], value: 20 },
          { caption: 'SEG-02', color: segColors[1], value: 20 },
          { caption: 'SEG-03', color: segColors[2], value: 30 },
          { caption: 'SEG-04', color: segColors[3], value: 20 }
        ]
      },
      { caption: 'React.js', color: '#61DAFB', value: 75,
        segments: [
          { caption: 'SEG-01', color: segColors[0], value: 10 },
          { caption: 'SEG-02', color: segColors[1], value: 15 },
          { caption: 'SEG-03', color: segColors[2], value: 25 },
          { caption: 'SEG-04', color: segColors[3], value: 25 }
        ]
      },
      { caption: 'JSF', color: '#F2A929', value: 60,
        segments: [
          { caption: 'SEG-01', color: segColors[0], value: 12 },
          { caption: 'SEG-02', color: segColors[1], value: 18 },
          { caption: 'SEG-03', color: segColors[2], value: 15 },
          { caption: 'SEG-04', color: segColors[3], value: 15 }
        ]
      }
    ];*/
  }

}
