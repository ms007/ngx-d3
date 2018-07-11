import { TestBed, inject } from '@angular/core/testing';

import { SegmentedBarChartService } from './segmented-bar-chart.service';

describe('SegmentedBarChartService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SegmentedBarChartService]
    });
  });

  it('should be created', inject([SegmentedBarChartService], (service: SegmentedBarChartService) => {
    expect(service).toBeTruthy();
  }));
});
