// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject, Signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { ButtonComponent } from '@components/button/button.component';
import { SelectButtonComponent } from '@components/select-button/select-button.component';
import { SelectComponent } from '@components/select/select.component';
import { ACCOUNTS, ORG_USER_TYPE_OPTIONS, PERSONA_OPTIONS } from '@lfx-one/shared/constants';
import { Account, isBoardScopedPersona, OrgUserType, PersonaType } from '@lfx-one/shared/interfaces';
import { AccountContextService } from '@services/account-context.service';
import { AppService } from '@services/app.service';
import { CookieRegistryService } from '@services/cookie-registry.service';
import { FeatureFlagService } from '@services/feature-flag.service';
import { PersonaService } from '@services/persona.service';
import { ProjectContextService } from '@services/project-context.service';
import { filter, map, startWith } from 'rxjs';

@Component({
  selector: 'lfx-dev-toolbar',
  imports: [ReactiveFormsModule, SelectButtonComponent, SelectComponent, ButtonComponent],
  templateUrl: './dev-toolbar.component.html',
  styleUrl: './dev-toolbar.component.scss',
})
export class DevToolbarComponent {
  private readonly personaService = inject(PersonaService);
  protected readonly projectContextService = inject(ProjectContextService);
  private readonly accountContextService = inject(AccountContextService);
  private readonly appService = inject(AppService);
  private readonly cookieRegistry = inject(CookieRegistryService);
  private readonly featureFlagService = inject(FeatureFlagService);
  private readonly router = inject(Router);

  // Feature flags — showDevToolbar from AppService (single source of truth for layout offsets)
  protected readonly showDevToolbar = this.appService.showDevToolbar;
  protected readonly showOrganizationSelector = this.featureFlagService.getBooleanFlag('organization-selector', true);

  // Active lens
  protected readonly activeLens = this.appService.activeLens;
  protected readonly showOrgSelector = computed(() => this.showOrganizationSelector() && (this.activeLens() === 'org' || this.isOnBoardDashboard()));

  // Organization selector options
  protected readonly availableAccounts = ACCOUNTS;

  // Persona options for SelectButton
  protected readonly personaOptions = PERSONA_OPTIONS;

  // Org user type options
  protected readonly orgUserTypeOptions = ORG_USER_TYPE_OPTIONS;

  // Show org user type selector only in org lens
  protected readonly showOrgUserTypeSelector = computed(() => this.activeLens() === 'org');

  // Board member project override — delegates to centralized isBoardScoped signal
  protected readonly isBoardMember = this.personaService.isBoardScoped;

  // Check if we're on the board dashboard page
  protected readonly isOnBoardDashboard: Signal<boolean> = this.initIsOnBoardDashboard();

  // Form for persona selector and organization selector
  public form: FormGroup;

  public constructor() {
    this.form = new FormGroup({
      persona: new FormControl<PersonaType>(this.personaService.currentPersona(), [Validators.required]),
      selectedAccountId: new FormControl<string>(this.accountContextService.selectedAccount().accountId),
      selectedProjectUid: new FormControl<string>(this.projectContextService.selectedFoundation()?.uid || ''),
      orgUserType: new FormControl<OrgUserType>(this.appService.orgUserType()),
    });

    // Subscribe to persona changes
    this.form
      .get('persona')
      ?.valueChanges.pipe(takeUntilDestroyed())
      .subscribe((value: PersonaType) => {
        if (isBoardScopedPersona(value)) {
          // TODO: DEMO - Remove when proper permissions are implemented
          const tlfProject = this.projectContextService.availableProjects.find((p) => p.slug === 'tlf');
          if (tlfProject) {
            this.projectContextService.setFoundation({
              uid: tlfProject.uid,
              name: tlfProject.name,
              slug: tlfProject.slug,
            });
            this.form.get('selectedProjectUid')?.setValue(tlfProject.uid, { emitEvent: false });
          }
        } else {
          // Navigate to the first project in the list that is not the TLF project
          const firstProject = this.projectContextService.availableProjects.find((p) => p.slug !== 'tlf');
          if (firstProject) {
            this.projectContextService.setProject(firstProject);
          }
        }

        this.personaService.setPersona(value);
      });

    // Subscribe to account selection changes
    this.form
      .get('selectedAccountId')
      ?.valueChanges.pipe(takeUntilDestroyed())
      .subscribe((value) => {
        const selectedAccount = ACCOUNTS.find((acc) => acc.accountId === value);
        if (selectedAccount) {
          this.accountContextService.setAccount(selectedAccount as Account);
        }
      });

    // Subscribe to board member project override changes
    this.form
      .get('selectedProjectUid')
      ?.valueChanges.pipe(takeUntilDestroyed())
      .subscribe((uid: string) => {
        const project = this.projectContextService.availableProjects.find((p) => p.uid === uid);
        if (project) {
          this.projectContextService.setFoundation(project);
        }
      });

    // Subscribe to org user type changes
    this.form
      .get('orgUserType')
      ?.valueChanges.pipe(takeUntilDestroyed())
      .subscribe((value: OrgUserType) => {
        this.appService.setOrgUserType(value);
      });
  }

  /**
   * Clear all LFX-related cookies and refresh the page
   * Uses the cookie registry to clear all tracked cookies
   */
  protected clearCache(): void {
    this.cookieRegistry.clearAllCookies();

    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  private initIsOnBoardDashboard(): Signal<boolean> {
    return toSignal(
      this.router.events.pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        map((event) => event.urlAfterRedirects),
        startWith(this.router.url),
        map((url) => url === '/' || url === '/dashboard' || url.startsWith('/dashboard?') || url.startsWith('/?'))
      ),
      { initialValue: this.router.url === '/' || this.router.url === '/dashboard' }
    );
  }
}
