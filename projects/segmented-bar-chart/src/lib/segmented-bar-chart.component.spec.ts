import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SegmentedBarChartComponent } from './segmented-bar-chart.component';

describe('SegmentedBarChartComponent', () => {
  let component: SegmentedBarChartComponent;
  let fixture: ComponentFixture<SegmentedBarChartComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SegmentedBarChartComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SegmentedBarChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
