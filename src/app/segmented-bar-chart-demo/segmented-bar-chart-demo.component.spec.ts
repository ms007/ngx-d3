import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SegmentedBarChartDemoComponent } from './segmented-bar-chart-demo.component';

describe('SegmentedBarChartDemoComponent', () => {
  let component: SegmentedBarChartDemoComponent;
  let fixture: ComponentFixture<SegmentedBarChartDemoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SegmentedBarChartDemoComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SegmentedBarChartDemoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
