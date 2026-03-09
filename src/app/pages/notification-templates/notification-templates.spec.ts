import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificationTemplates } from './notification-templates';

describe('NotificationTemplates', () => {
  let component: NotificationTemplates;
  let fixture: ComponentFixture<NotificationTemplates>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationTemplates]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotificationTemplates);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
