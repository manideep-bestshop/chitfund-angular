import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChitGroups } from './chit-groups';

describe('ChitGroups', () => {
  let component: ChitGroups;
  let fixture: ComponentFixture<ChitGroups>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChitGroups]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChitGroups);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
