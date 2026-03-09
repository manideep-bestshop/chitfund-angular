import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JoinGroup } from './join-group';

describe('JoinGroup', () => {
  let component: JoinGroup;
  let fixture: ComponentFixture<JoinGroup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JoinGroup]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JoinGroup);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
