import { TestBed, inject } from '@angular/core/testing';

import { BubbleChartService } from './bubble-chart.service';

describe('BubbleChartService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BubbleChartService]
    });
  });

  it('should be created', inject([BubbleChartService], (service: BubbleChartService) => {
    expect(service).toBeTruthy();
  }));
});
