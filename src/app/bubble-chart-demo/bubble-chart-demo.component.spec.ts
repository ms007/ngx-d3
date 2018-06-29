import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BubbleChartDemoComponent } from './bubble-chart-demo.component';

describe('BubbleChartDemoComponent', () => {
  let component: BubbleChartDemoComponent;
  let fixture: ComponentFixture<BubbleChartDemoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BubbleChartDemoComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BubbleChartDemoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
