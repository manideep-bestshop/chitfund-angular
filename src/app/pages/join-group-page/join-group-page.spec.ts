import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JoinGroupPage } from './join-group-page';

describe('JoinGroupPage', () => {
  let component: JoinGroupPage;
  let fixture: ComponentFixture<JoinGroupPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JoinGroupPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JoinGroupPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
