import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RankpilotLibrary } from './rankpilot-library';

describe('RankpilotLibrary', () => {
  let component: RankpilotLibrary;
  let fixture: ComponentFixture<RankpilotLibrary>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RankpilotLibrary]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RankpilotLibrary);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
