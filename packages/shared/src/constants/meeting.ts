// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { MeetingType } from '../enums';
import { MeetingTemplateGroup } from '../interfaces';

export const MEETING_PLATFORMS = [
  {
    value: 'zoom',
    label: 'Zoom',
    description: 'Video conferencing with recording and chat features',
    available: true,
    icon: 'fa-light fa-video',
    color: '#0094FF',
  },
  {
    value: 'teams',
    label: 'Microsoft Teams',
    description: 'Integrated collaboration with Office 365',
    available: false,
    icon: 'fa-light fa-desktop',
    color: '#6b7280',
  },
  {
    value: 'in-person',
    label: 'In-Person',
    description: 'Physical meeting location',
    available: false,
    icon: 'fa-light fa-location-dot',
    color: '#6b7280',
  },
];

export const MEETING_FEATURES = [
  {
    key: 'recording_enabled',
    icon: 'fa-light fa-video',
    title: 'Enable Recording',
    description: 'Record the meeting for those who cannot attend live',
    recommended: true,
    color: '#3b82f6', // blue - matches bg-blue-50 text-blue-700
  },
  {
    key: 'transcripts_enabled',
    icon: 'fa-light fa-file-lines',
    title: 'Generate Transcripts',
    description: 'Automatically create searchable text transcripts',
    recommended: false,
    color: '#8b5cf6', // purple - matches bg-purple-50 text-purple-700
  },
  {
    key: 'youtube_enabled',
    icon: 'fa-light fa-upload',
    title: 'YouTube Auto-upload',
    description: "Automatically publish recordings to your project's YouTube channel",
    recommended: false,
    color: '#dc2626', // red - matches bg-red-50 text-red-700
  },
  {
    key: 'zoom_ai_enabled',
    icon: 'fa-light fa-microchip-ai',
    title: 'AI Meeting Summary',
    description: 'Generate key takeaways and action items automatically',
    recommended: true,
    color: '#16a34a', // green - matches bg-green-50 text-green-700
  },
  {
    key: 'show_in_public_calendar',
    icon: 'fa-light fa-calendar-check',
    title: 'Show in Public Calendar',
    description: 'Make this meeting visible in the public project calendar',
    recommended: true,
    color: '#ea580c', // orange - unique color for calendar visibility
  },
];

export const RECORDING_ACCESS_OPTIONS = [
  { label: 'Members Only', value: 'Members' },
  { label: 'Public', value: 'Public' },
  { label: 'Private', value: 'Private' },
];

export const AI_SUMMARY_ACCESS_OPTIONS = [
  { label: 'PCC Members', value: 'PCC' },
  { label: 'Project Members', value: 'Members' },
  { label: 'Public', value: 'Public' },
];

export const MEETING_TEMPLATES: MeetingTemplateGroup[] = [
  {
    meetingType: MeetingType.BOARD,
    templates: [
      {
        id: 'board-quarterly-review',
        title: 'Quarterly Board Review',
        meetingType: MeetingType.BOARD,
        estimatedDuration: 70,
        content: `Quarterly Board Review

1. Opening & Governance (10 min)
- Roll call and quorum confirmation
- Approval of previous meeting minutes
- Conflict of interest declarations

2. Executive Report (20 min)
- Project health and key metrics
- Financial overview and budget status
- Strategic initiatives progress

3. Key Decisions (25 min)
- Budget approvals and amendments
- Strategic direction discussions
- Policy updates and governance changes

4. Risk & Compliance (10 min)
- Risk assessment review
- Compliance status update
- Legal matters requiring board attention

5. Next Steps & Closing (5 min)
- Action item assignments
- Next meeting scheduling
- Adjournment`,
      },
      {
        id: 'board-strategic-planning',
        title: 'Strategic Planning Session',
        meetingType: MeetingType.BOARD,
        estimatedDuration: 75,
        content: `Strategic Planning Session

1. Current State Assessment (15 min)
- Project performance review
- Market position analysis
- Resource and capability assessment

2. Vision & Goals Setting (25 min)
- Long-term vision discussion
- Strategic objectives for next period
- Success metrics definition

3. Resource Planning (15 min)
- Budget allocation priorities
- Human resource requirements
- Infrastructure and technology needs

4. Implementation Planning (15 min)
- Timeline and milestone setting
- Responsibility assignments
- Risk mitigation strategies

5. Approval & Next Steps (5 min)
- Plan approval and ratification
- Communication strategy
- Follow-up meeting scheduling`,
      },
      {
        id: 'board-budget-review',
        title: 'Annual Budget Review',
        meetingType: MeetingType.BOARD,
        estimatedDuration: 70,
        content: `Annual Budget Review

1. Financial Overview (15 min)
- Current year financial performance
- Revenue sources and sustainability
- Expense analysis and trends

2. Budget Proposal Review (30 min)
- Proposed budget for next fiscal year
- Line-item discussion and justification
- Funding sources and allocation

3. Investment Priorities (10 min)
- Technology and infrastructure investments
- Human resource investments
- Strategic initiative funding

4. Approval Process (10 min)
- Budget amendments and modifications
- Formal budget approval
- Oversight and monitoring procedures

5. Implementation Planning (5 min)
- Budget rollout timeline
- Communication to stakeholders
- Quarterly review scheduling`,
      },
    ],
  },
  {
    meetingType: MeetingType.MAINTAINERS,
    templates: [
      {
        id: 'maintainers-weekly-sync',
        title: 'Weekly Maintainers Sync',
        meetingType: MeetingType.MAINTAINERS,
        estimatedDuration: 60,
        content: `Weekly Maintainers Sync

1. Project Status Update (10 min)
- Current sprint/milestone progress
- Key metrics and health indicators
- Community activity highlights

2. Pull Request & Issue Review (20 min)
- High-priority pull requests
- Critical issues and bug reports
- Code review assignments

3. Community Contributions (15 min)
- New contributor onboarding
- Community feedback and requests
- Contribution guidelines updates

4. Technical Decisions (10 min)
- Architecture and design discussions
- Library and dependency updates
- Security and performance considerations

5. Planning & Coordination (5 min)
- Upcoming releases and deadlines
- Task assignments and ownership
- Next week's priorities`,
      },
      {
        id: 'maintainers-release-planning',
        title: 'Release Planning Meeting',
        meetingType: MeetingType.MAINTAINERS,
        estimatedDuration: 70,
        content: `Release Planning Meeting

1. Release Scope Review (15 min)
- Feature requirements and specifications
- Bug fixes and improvements included
- Breaking changes and migration needs

2. Technical Readiness (20 min)
- Code completion status
- Testing coverage and quality metrics
- Documentation updates required

3. Community Impact Assessment (15 min)
- User experience improvements
- Backwards compatibility considerations
- Migration guides and support needed

4. Release Timeline (10 min)
- Development milestones and deadlines
- Testing and QA schedule
- Release candidate and stable release dates

5. Communication & Support (10 min)
- Release announcement planning
- Documentation and tutorial updates
- Community support preparation`,
      },
      {
        id: 'maintainers-architecture-review',
        title: 'Technical Architecture Review',
        meetingType: MeetingType.MAINTAINERS,
        estimatedDuration: 70,
        content: `Technical Architecture Review

1. Current Architecture Assessment (15 min)
- System performance and scalability
- Technical debt and maintenance burden
- Security and reliability status

2. Proposed Changes Discussion (25 min)
- New feature architecture proposals
- Infrastructure improvements
- Technology stack updates

3. Implementation Planning (15 min)
- Development approach and methodology
- Resource requirements and timeline
- Risk assessment and mitigation

4. Community Impact (10 min)
- Developer experience improvements
- API changes and backwards compatibility
- Documentation and migration support

5. Decision & Next Steps (5 min)
- Architecture decisions and approvals
- Implementation assignments
- Follow-up meetings and reviews`,
      },
    ],
  },
  {
    meetingType: MeetingType.MARKETING,
    templates: [
      {
        id: 'marketing-community-growth',
        title: 'Community Growth Strategy',
        meetingType: MeetingType.MARKETING,
        estimatedDuration: 70,
        content: `Community Growth Strategy

1. Current Community Analysis (15 min)
- User engagement metrics and trends
- Community platform performance
- User feedback and satisfaction surveys

2. Growth Initiatives Planning (25 min)
- Content marketing strategy
- Event planning and conference participation
- Partnership and collaboration opportunities

3. Campaign Development (15 min)
- Social media campaign planning
- Documentation and tutorial improvements
- Community recognition programs

4. Outreach & Partnerships (10 min)
- Industry partnerships and integrations
- Educational institution engagement
- Corporate adoption strategies

5. Metrics & Success Tracking (5 min)
- KPI definition and tracking
- ROI measurement approaches
- Quarterly goal setting`,
      },
      {
        id: 'marketing-content-strategy',
        title: 'Content & Documentation Strategy',
        meetingType: MeetingType.MARKETING,
        estimatedDuration: 70,
        content: `Content & Documentation Strategy

1. Content Audit & Analysis (15 min)
- Existing content performance review
- User journey and pain point analysis
- Content gap identification

2. Documentation Planning (20 min)
- User guide improvements
- API documentation updates
- Tutorial and example development

3. Content Creation Strategy (20 min)
- Blog post and article planning
- Video and multimedia content
- Community-generated content programs

4. Distribution & Promotion (10 min)
- Website and platform optimization
- Social media distribution strategy
- Email marketing and newsletters

5. Community Engagement (5 min)
- User feedback collection
- Community contributor recognition
- Content collaboration opportunities`,
      },
      {
        id: 'marketing-event-planning',
        title: 'Event & Conference Planning',
        meetingType: MeetingType.MARKETING,
        estimatedDuration: 70,
        content: `Event & Conference Planning

1. Event Strategy & Goals (15 min)
- Participation objectives and outcomes
- Target audience and user personas
- Brand positioning and messaging

2. Event Selection & Planning (25 min)
- Conference and meetup opportunities
- Speaking engagements and presentations
- Booth and sponsor considerations

3. Content & Materials Preparation (15 min)
- Presentation and demo development
- Marketing materials and swag
- Documentation and handout creation

4. Community Coordination (10 min)
- Volunteer and speaker coordination
- Travel and logistics planning
- Budget and resource allocation

5. Follow-up & Measurement (5 min)
- Lead capture and follow-up strategy
- Success metrics and ROI tracking
- Post-event community engagement`,
      },
    ],
  },
  {
    meetingType: MeetingType.TECHNICAL,
    templates: [
      {
        id: 'technical-sprint-planning',
        title: 'Sprint Planning & Technical Review',
        meetingType: MeetingType.TECHNICAL,
        estimatedDuration: 70,
        content: `Sprint Planning & Technical Review

1. Sprint Review & Retrospective (15 min)
- Previous sprint accomplishments
- Velocity and capacity analysis
- Team feedback and process improvements

2. Technical Debt Assessment (20 min)
- Code quality and maintainability review
- Performance bottlenecks and optimization
- Security vulnerabilities and fixes

3. Feature Development Planning (20 min)
- User story refinement and estimation
- Technical implementation approaches
- Cross-team dependencies and coordination

4. Infrastructure & DevOps (10 min)
- CI/CD pipeline improvements
- Testing automation and coverage
- Deployment and monitoring updates

5. Sprint Commitment & Goals (5 min)
- Sprint goal definition
- Task assignments and ownership
- Success criteria and acceptance`,
      },
      {
        id: 'technical-api-design',
        title: 'API Design & Architecture Review',
        meetingType: MeetingType.TECHNICAL,
        estimatedDuration: 70,
        content: `API Design & Architecture Review

1. Current API Analysis (15 min)
- Usage metrics and performance data
- User feedback and pain points
- Compatibility and versioning status

2. Proposed API Changes (25 min)
- New endpoint specifications
- Breaking changes and migration plans
- Authentication and security updates

3. Implementation Details (15 min)
- Technical implementation approach
- Database and data model changes
- Testing and validation strategies

4. Documentation & Developer Experience (10 min)
- API documentation updates
- SDK and client library considerations
- Developer onboarding improvements

5. Release Planning & Timeline (5 min)
- Development and testing schedule
- Beta testing and feedback collection
- Production release planning`,
      },
      {
        id: 'technical-security-performance',
        title: 'Security & Performance Review',
        meetingType: MeetingType.TECHNICAL,
        estimatedDuration: 70,
        content: `Security & Performance Review

1. Security Assessment (20 min)
- Vulnerability scanning results
- Penetration testing findings
- Compliance and audit requirements

2. Performance Analysis (20 min)
- System performance metrics
- Load testing and capacity planning
- Database and query optimization

3. Infrastructure Security (15 min)
- Access control and authentication
- Network security and firewalls
- Data encryption and privacy

4. Incident Response & Monitoring (10 min)
- Security incident procedures
- Monitoring and alerting systems
- Backup and disaster recovery

5. Action Items & Implementation (5 min)
- Priority security fixes
- Performance optimization tasks
- Follow-up testing and validation`,
      },
    ],
  },
  {
    meetingType: MeetingType.LEGAL,
    templates: [
      {
        id: 'legal-compliance-risk',
        title: 'Compliance & Risk Assessment',
        meetingType: MeetingType.LEGAL,
        estimatedDuration: 70,
        content: `Compliance & Risk Assessment

1. Regulatory Compliance Review (20 min)
- Current compliance status assessment
- New regulatory requirements and changes
- Industry standards and best practices

2. Legal Risk Analysis (20 min)
- Intellectual property and licensing risks
- Data privacy and protection compliance
- Contract and agreement reviews

3. Policy & Procedure Updates (15 min)
- Code of conduct and community guidelines
- Contributor agreement and licensing
- Terms of service and privacy policy

4. Documentation & Record Keeping (10 min)
- Legal documentation maintenance
- Record retention and disposal policies
- Audit trail and compliance tracking

5. Action Items & Implementation (5 min)
- Priority compliance tasks
- Legal consultation requirements
- Policy communication and training`,
      },
      {
        id: 'legal-licensing-ip',
        title: 'Licensing & Intellectual Property',
        meetingType: MeetingType.LEGAL,
        estimatedDuration: 70,
        content: `Licensing & Intellectual Property

1. Current License Analysis (15 min)
- Open source license compliance
- Third-party dependency licensing
- License compatibility assessment

2. Intellectual Property Review (20 min)
- Copyright and trademark protection
- Patent considerations and freedom to operate
- Contributor intellectual property rights

3. License Strategy Planning (20 min)
- License selection and justification
- Dual licensing considerations
- Commercial licensing opportunities

4. Compliance Implementation (10 min)
- License header and notice requirements
- Attribution and acknowledgment procedures
- License violation response protocols

5. Documentation & Communication (5 min)
- License documentation updates
- Community communication strategy
- Legal consultation follow-up`,
      },
      {
        id: 'legal-contract-agreement',
        title: 'Contract & Agreement Review',
        meetingType: MeetingType.LEGAL,
        estimatedDuration: 70,
        content: `Contract & Agreement Review

1. Existing Agreements Assessment (15 min)
- Vendor and service provider contracts
- Partnership and collaboration agreements
- Employment and contractor agreements

2. New Agreement Evaluation (25 min)
- Contract terms and conditions review
- Risk assessment and mitigation
- Negotiation strategy and priorities

3. Compliance & Performance (15 min)
- Contract performance monitoring
- Service level agreement compliance
- Dispute resolution and management

4. Legal & Financial Implications (10 min)
- Cost and budget considerations
- Liability and insurance requirements
- Termination and transition planning

5. Approval & Next Steps (5 min)
- Contract approval recommendations
- Implementation and execution timeline
- Ongoing monitoring and review schedule`,
      },
    ],
  },
  {
    meetingType: MeetingType.OTHER,
    templates: [
      {
        id: 'other-community-workshop',
        title: 'Community Workshop Planning',
        meetingType: MeetingType.OTHER,
        estimatedDuration: 70,
        content: `Community Workshop Planning

1. Workshop Objectives & Goals (15 min)
- Learning objectives and outcomes
- Target audience and skill levels
- Success metrics and evaluation

2. Content & Curriculum Development (25 min)
- Workshop structure and agenda
- Materials and resource preparation
- Hands-on exercises and activities

3. Logistics & Coordination (15 min)
- Venue and platform selection
- Registration and attendance management
- Technical setup and requirements

4. Speaker & Facilitator Coordination (10 min)
- Speaker recruitment and preparation
- Content review and feedback
- Backup plans and contingencies

5. Promotion & Follow-up (5 min)
- Marketing and outreach strategy
- Post-workshop feedback collection
- Community engagement opportunities`,
      },
      {
        id: 'other-project-retrospective',
        title: 'Project Retrospective & Planning',
        meetingType: MeetingType.OTHER,
        estimatedDuration: 70,
        content: `Project Retrospective & Planning

1. Project Review & Assessment (20 min)
- Accomplishments and milestones achieved
- Challenges and obstacles encountered
- Lessons learned and best practices

2. Community Feedback Analysis (20 min)
- User feedback and satisfaction surveys
- Contributor experience and engagement
- Adoption metrics and usage patterns

3. Future Planning & Roadmap (20 min)
- Strategic priorities and objectives
- Feature roadmap and development plans
- Community growth and engagement goals

4. Resource & Capacity Planning (10 min)
- Team capacity and skill assessment
- Budget and funding considerations
- Infrastructure and tooling needs

5. Action Items & Next Steps (5 min)
- Priority initiatives and projects
- Responsibility assignments
- Timeline and milestone planning`,
      },
      {
        id: 'other-cross-team-collaboration',
        title: 'Cross-Team Collaboration Meeting',
        meetingType: MeetingType.OTHER,
        estimatedDuration: 70,
        content: `Cross-Team Collaboration Meeting

1. Team Updates & Status (15 min)
- Current project status from each team
- Key accomplishments and milestones
- Upcoming priorities and deadlines

2. Collaboration Opportunities (25 min)
- Shared projects and initiatives
- Resource sharing and coordination
- Knowledge transfer and best practices

3. Communication & Process Improvement (15 min)
- Communication channels and tools
- Meeting cadence and effectiveness
- Documentation and information sharing

4. Conflict Resolution & Alignment (10 min)
- Priority conflicts and trade-offs
- Resource allocation discussions
- Decision-making processes

5. Action Items & Coordination (5 min)
- Cross-team action items
- Regular sync scheduling
- Escalation and communication protocols`,
      },
    ],
  },
];
