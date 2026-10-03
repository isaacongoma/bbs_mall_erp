BBS MALL ENTERPRISE MANAGEMENT & DIGITAL OPERATIONS PLATFORM
System Requirements, Enterprise Architecture & Technology Blueprint
Version 1.0 | September 2026
1. Executive Summary
The BBS Mall Enterprise Management & Digital Operations Platform is envisioned as a unified, enterprise-grade digital platform for managing the physical mall, its tenants, customers, commercial operations, facilities, security, parking, finance, compliance, connectivity, media and digital commerce. It is intended to operate as a single digital ecosystem rather than a collection of disconnected applications.
The platform should be designed to international enterprise standards: API-first, secure-by-design, observable, scalable, modular, event-driven where appropriate, and deployable in cloud, on-premises or hybrid environments. The architecture should support future rollout to additional malls without requiring a fundamental redesign.
2. Vision and Objectives
•	Create a single source of truth for mall, tenant, unit, lease, customer, asset and operational data.
•	Digitize leasing, tenancy, billing, payments, facilities, security, parking and compliance workflows.
•	Provide tenants with digital storefronts through the BBS Mall e-commerce marketplace.
•	Provide customers with mobile and web experiences for shopping, navigation, parking, loyalty and events.
•	Integrate M-Pesa and other payment channels with automated reconciliation and receipts.
•	Integrate parking technology such as SKIDATA for reservations, payment validation and barrier/access control.
•	Integrate CCTV, access control, ANPR and AI video analytics for security operations.
•	Use footfall and spatial analytics to understand mall traffic and support commercial planning.
•	Provide enterprise dashboards, audit trails, alerts, reporting and operational intelligence.
•	Create an extensible platform that can support additional malls, buildings, regions and business units.
3. Guiding Architecture Principles
API-first: All major business capabilities are exposed through secured APIs rather than being locked inside a single UI.
Modular by domain: Business capabilities are separated into bounded domains so teams can evolve them independently.
Event-driven where useful: Important business events such as payment completed, lease expired, incident created and parking access granted can be published to an event bus.
Security by design: Identity, authorization, encryption, auditability, secrets management and privacy are foundational.
Cloud-ready and hybrid-capable: The platform can run on public cloud, private infrastructure or a hybrid model.
Mobile-first customer experience: Customer journeys such as navigation, parking, loyalty and shopping are optimized for mobile.
Observability by default: Logs, metrics, traces, health checks and audit events are available across critical services.
Interoperability: External systems are integrated through documented APIs, adapters, webhooks, queues or approved protocols.
Data ownership: Each domain owns its data and exposes controlled interfaces to other domains.
Progressive complexity: Start with a modular architecture and evolve selected domains into independently deployed services when scale or organizational boundaries justify it.
4. User Channels and Applications
BBS Mall Customer Mobile App — Directory and wayfinding, tenant/shop discovery, e-commerce, parking reservation/payment, digital receipts, loyalty points, events, promotions, Wi-Fi access and notifications.
BBS Mall Customer Web — Public mall website, directory, tenant storefronts, e-commerce, events, promotions, media and selected customer services.
Tenant Portal / Tenant App — Tenant profile, lease information, invoices, receipts, payments, products, orders, storefront management, notices, permits, compliance documents, service requests and communications.
Mall Staff Web Application — Enterprise back-office for leasing, finance, facilities, security, parking, compliance, utilities, media, customer service and administration.
Security Operations Console — CCTV wall/streams, AI alerts, incidents, guard tours, playbooks, access events, investigations and security reporting.
Facilities Operations Console — Assets, PPM, corrective maintenance, work orders, contractors, permits, service contracts and utility operations.
Management Executive Dashboard — KPIs across occupancy, rent, collections, footfall, sales, parking, security, assets, utilities, compliance and tenant performance.
Digital Signage / Media Console — Content, campaigns, schedules, screen groups, approvals and playback monitoring.
5. Functional Domain Architecture
5.1 Mall, Property & Unit Registry
Mall/building/floor/zone/unit hierarchy; stall/shop numbering; unit types; floor plans; occupancy state; public spaces; common areas; parking areas; entrances and lifts.
5.2 Tenant & Tenancy Management
Tenant master records; contacts; businesses; beneficial/authorized contacts; tenant documents; onboarding; tenant status; tenant users; tenant-unit relationships; tenancy history.
5.3 Leasing & Contract Management
Lease creation; commercial terms; start/end dates; deposits; renewals; amendments; rent schedules; escalation rules; notices; approvals; expiries; contract repository.
5.4 Billing, Receivables & Payments
Recurring rent; service charges; utility charges; penalties; deposits; invoices; credit notes; receipts; allocation; outstanding balances; payment reconciliation; statements; collections.
5.5 M-Pesa & Payment Integration
STK Push, payment callbacks, transaction validation, automated allocation, reconciliation, refunds where supported, payment references and audit trails.
5.6 Tenant E-Commerce Marketplace
Automatic tenant storefront provisioning; products; categories; pricing; inventory; orders; customer accounts; fulfillment; tenant-level sales reporting; commissions/fees if introduced.
5.7 Parking Management
Parking inventory; spaces; reserved spaces; pre-booking; vehicle records; number plates; mobile-number linkage; tariffs; payment validation; entry/exit events; barrier authorization; integration adapter for SKIDATA.
5.8 Security Operations
CCTV integration; camera registry; live monitoring; AI event detection; alerts; incident management; evidence references; guard dispatch; investigations; access events; security reports.
5.9 Guard Tours & Incident Playbooks
Scheduled patrol routes; checkpoints; QR/NFC or approved checkpoint technology; missed checkpoints; incident response procedures; escalation matrices; acknowledgements; closure and post-incident review.
5.10 Access Control & ANPR
Identity/vehicle access rules; entrances; staff/tenant permissions; number-plate recognition integration; access decisions; event history and exceptions.
5.11 Facilities & Asset Management
Asset register; asset hierarchy; locations; warranties; service contracts; preventive maintenance; corrective maintenance; work orders; inspections; downtime; spare parts and contractors.
5.12 Energy & Utilities
Electricity/water/other utility accounts; meters; readings; consumption; tariffs; supplier bills; allocations; tenant utility billing; anomaly monitoring.
5.13 Safety & Compliance
OSHA records; fire audits; inspections; county permits; land rates; compliance calendars; corrective actions; evidence; ODPC/privacy controls; expiry and renewal alerts.
5.14 Tenant Communications
Notices; invoices; receipts; SMS; WhatsApp; email; templates; campaigns; delivery status; tenant communication history.
5.15 Wi-Fi / Hotspot Management
Access points; zones; plans; credentials/tokens; captive portal integration; usage records; tenant/public access policies; device/session visibility subject to privacy requirements.
5.16 Media, Events & Digital Advertising
Mall events; event registration; content library; campaigns; advertising inventory; screen groups; schedules; approvals; playback status; website publishing.
5.17 Directory & Wayfinding
Search shops, products, facilities and points of interest; floor-aware maps; route calculation; entrances; lifts; escalators; accessible routes; turn-by-turn guidance where supported.
5.18 Loyalty & Rewards
Customer loyalty account; points ledger; earning rules; M-Pesa/payment-linked rewards; promotions; redemption; expiry; adjustments; fraud controls and audit trail.
5.19 Footfall & Sales Intelligence
People counting; 3D counting; entrances; lifts; zones; tenant-area traffic; traffic trends; conversion indicators when sales data is available; premium-zone analytics.
5.20 Reporting & Business Intelligence
Operational dashboards; finance; leasing; occupancy; collections; tenant performance; footfall; parking; security; facilities; utilities; compliance; executive KPIs.
6. High-Level System Architecture
Recommended logical flow: Users and devices → Web/Mobile/Operations UIs → API Gateway/BFF layer → Domain modules/services → PostgreSQL transactional data → Redis cache → Event Bus/Queues → Integration adapters → external systems. Analytics workloads should be separated from transactional workloads.
•	Presentation layer: React + TypeScript web applications; React Native mobile applications.
•	API layer: NestJS-based REST APIs with OpenAPI documentation; WebSockets for real-time operational events where required.
•	Identity layer: centralized authentication using OAuth 2.0/OpenID Connect compatible identity provider; MFA for privileged roles.
•	Domain layer: modular NestJS bounded contexts with clear ownership and contracts.
•	Event layer: Kafka or a managed Kafka-compatible service for high-volume durable events; RabbitMQ may be used for simpler workflow queues where appropriate.
•	Cache layer: Redis for hot data, rate limiting, distributed locks where required, sessions where appropriate, and short-lived operational state.
•	Transactional database: PostgreSQL with PostGIS where geographic/spatial capabilities are required.
•	Object storage: S3-compatible storage for documents, media, evidence references and other large objects.
•	Search: OpenSearch/Elasticsearch-compatible search where full-text, directory and operational search needs exceed PostgreSQL capabilities.
•	Analytics: separate analytical store/lakehouse as scale grows; do not run heavy BI queries directly against the core OLTP database.
•	Observability: OpenTelemetry with centralized logs, metrics, traces, dashboards and alerting.
•	Deployment: Kubernetes or managed container platform for enterprise-scale deployments; simpler container orchestration can be used during initial rollout.
7. Recommended Technology Stack
Web — React + TypeScript + Vite; a mature component system/design system; TanStack Query for server state.
Mobile — React Native + TypeScript; native modules only where required for device-specific capabilities.
Backend — NestJS + TypeScript; modular domain architecture; REST/OpenAPI; WebSockets where required.
Primary Database — PostgreSQL; PostGIS for spatial/wayfinding-related data.
Cache — Redis.
Messaging/Event Streaming — Kafka for high-volume event streaming; RabbitMQ for selected task/workflow queues if justified.
Search — OpenSearch.
Object Storage — S3-compatible object storage.
Identity — Keycloak or an enterprise managed OIDC provider; OAuth 2.0/OIDC; MFA.
API Gateway — Kong, NGINX, Traefik or a managed cloud API gateway depending on deployment environment.
Observability — OpenTelemetry + Prometheus/Grafana + centralized log platform.
CI/CD — GitHub Actions or enterprise CI/CD equivalent; containerized builds and automated testing.
Containers — Docker/OCI containers; Kubernetes for larger production environments.
Infrastructure as Code — Terraform/OpenTofu.
Secrets — Vault or cloud-native secrets manager.
Security Scanning — SAST, dependency scanning, container scanning, DAST and secret scanning integrated into CI/CD.
8. Core Data Architecture
The core transactional model should include, at minimum, the following logical entities:
•	Organization / Mall / Building / Floor / Zone / Unit / Public Space
•	Tenant / Business / Tenant User / Contact / Tenant Document
•	Lease / Lease Term / Charge Rule / Deposit / Contract / Renewal
•	Invoice / Invoice Line / Credit Note / Payment / Payment Allocation / Receipt / Refund / Reconciliation
•	Customer / Customer Identity / Vehicle / Loyalty Account / Loyalty Ledger / Reward / Redemption
•	Product / Category / Storefront / Inventory / Order / Order Line / Shipment/Fulfillment
•	Parking Area / Space / Reservation / Parking Session / Tariff / Access Event
•	Camera / Camera Zone / AI Event / Security Alert / Incident / Evidence Reference / Guard / Tour / Checkpoint / Playbook
•	Asset / Asset Category / Maintenance Plan / Work Order / Inspection / Contractor / Service Contract / Permit
•	Meter / Utility Account / Reading / Utility Bill / Allocation
•	Compliance Requirement / Audit / Finding / Corrective Action / Permit / Expiry
•	Event / Campaign / Media Asset / Screen / Screen Group / Playlist / Schedule
•	Map / Point of Interest / Route Node / Wayfinding Segment
•	Notification / Template / Delivery / Communication Log
•	Audit Event / User Session / API Client / Integration Event
9. API & Integration Architecture
All integrations should use versioned contracts, authentication, idempotency, retries, timeouts, dead-letter handling, correlation IDs and auditable transaction states.
M-Pesa — Payment initiation/callbacks, validation, reconciliation, payment status and customer reference mapping.
SKIDATA — Parking inventory/status, reservations or access-control integration according to the specific SKIDATA interfaces licensed and available.
CCTV/VMS — Camera discovery, streams/events and alarms using vendor-supported standards/APIs such as ONVIF or vendor APIs where applicable.
AI Video Analytics — Event metadata rather than unnecessary raw video duplication; integrate with the chosen VMS/analytics platform.
ANPR — Vehicle plate events and confidence metadata; connect to access rules and parking sessions.
SMS — Transactional and bulk notification provider.
WhatsApp — Business messaging provider/API for approved tenant/customer communication workflows.
Wi-Fi — Network controller/captive portal/RADIUS or vendor APIs depending on selected infrastructure.
Digital Signage — Screen/player APIs, content schedules, playback confirmation and health status.
Maps/Wayfinding — Indoor map data and routing engine; support accessible routes and floor transitions.
Accounting/ERP — Optional integration for financial posting, supplier invoices and reconciliation.
BI/Data Platform — Publish curated events and datasets to analytical systems without exposing the OLTP database directly.
10. Security Architecture
•	Zero-trust principles for service-to-service and user access.
•	OIDC/OAuth 2.0 for authentication and delegated authorization.
•	Role-Based Access Control with optional Attribute-Based Access Control for sensitive operations.
•	MFA for administrators, finance, security and other privileged roles.
•	TLS for all network traffic; encryption at rest for databases and object storage.
•	Secrets stored outside source code and rotated through a secrets manager.
•	Immutable/auditable records for financial, security, access and administrative actions.
•	API rate limiting, WAF protection, input validation and schema validation.
•	Idempotency keys for payment and other critical write operations.
•	Network segmentation between public applications, application services, databases, security systems and management networks.
•	Least privilege for users, services and integrations.
•	Security monitoring, vulnerability management, dependency scanning and regular penetration testing.
•	Privacy-by-design for CCTV, customer identity, vehicle plates, Wi-Fi and analytics data.
11. CCTV, AI and Privacy Architecture
Security AI should be treated as an assistive detection capability, not an autonomous decision maker. The system should distinguish camera events, alerts and verified incidents. Retention, access, evidence handling and analytics should follow applicable privacy and security requirements and documented mall policies.
•	Camera/VMS layer collects and manages video streams.
•	AI analytics layer detects configured events such as intrusion, crowding or other approved operational/security conditions.
•	Event broker distributes metadata to the Security Operations Console.
•	Guards acknowledge and manage alerts through defined incident workflows.
•	Incident records preserve timestamps, location, alert source, response actions and closure information.
•	Reports support time-window analysis, for example all security events between 05:00 and 06:00.
•	Footfall analytics should use appropriately designed counting/anonymization techniques where possible and keep identifiable data separate from aggregate analytics.
12. Parking Workflow
1.	Customer registers or signs in and associates a mobile number with one or more vehicle number plates.
2.	Customer views available parking and optionally reserves a designated space.
3.	Payment is initiated through supported payment channels, including M-Pesa.
4.	Successful payment creates a validated parking entitlement.
5.	Parking integration validates the entitlement at entry/exit.
6.	Barrier/access control opens when the entitlement and vehicle identity meet configured rules.
7.	Exceptions such as unpaid, expired, duplicated or invalid sessions are routed to parking staff.
8.	Every payment and access event is auditable and correlated with the parking session.
13. E-Commerce & Tenant Storefront Workflow
9.	Approved tenant is provisioned with a storefront automatically.
10.	Tenant configures products, categories, prices, images, stock and operating information.
11.	Customer discovers the tenant through the BBS Mall website/app or directory.
12.	Customer places an order and completes payment through supported payment channels.
13.	Order is routed to the tenant for fulfillment.
14.	Customer receives status notifications.
15.	Tenant and management dashboards provide order and sales analytics.
16.	Commerce data can feed mall intelligence without exposing unnecessary personal information.
14. Directory & Indoor Wayfinding
•	Search by tenant, shop, category, product, service, facility or event.
•	Show floor and unit location.
•	Provide route from the customer's selected starting point to the destination.
•	Support entrances, lifts, escalators and accessible routes.
•	Provide mobile navigation with clear step-by-step instructions.
•	Allow mall operations to update maps and points of interest without requiring a software release.
15. Loyalty & Rewards
•	Each customer has a loyalty account and immutable points ledger.
•	Rules determine how eligible payments or purchases earn points.
•	M-Pesa payment confirmation can trigger an earning event after validation.
•	Redemptions create separate ledger entries and cannot silently alter historical transactions.
•	Points can have expiry dates, campaign multipliers and controlled manual adjustments.
•	Fraud and duplicate-event controls are required.
•	Customers can view balance, earning history and redemption history.
16. Notifications & Communications
A centralized notification service should support:
•	SMS
•	WhatsApp
•	Email
•	Push notifications
•	In-app notices
•	Tenant notices
•	Invoices and receipts
•	Security/operations alerts
17. Reporting & Analytics
•	Occupancy and vacancy
•	Lease expiry and renewal pipeline
•	Rent billed, collected and outstanding
•	Tenant statements
•	Parking utilization and revenue
•	Security incidents and response times
•	Guard tour completion
•	Asset maintenance performance and downtime
•	Energy and water consumption
•	Compliance status and upcoming expiries
•	Footfall by entrance, floor, zone and time period
•	Tenant sales and e-commerce performance
•	Loyalty activity
•	Media campaign performance
•	Wi-Fi usage and access-point health
18. Non-Functional Requirements
Availability — Critical customer and operational services should be designed for high availability with defined RTO/RPO targets.
Performance — Common API requests should be optimized for low latency; heavy analytics must not block transactional workloads.
Scalability — Horizontal scaling for stateless APIs, workers and event consumers.
Reliability — Retries with backoff, circuit breakers where appropriate, idempotency and dead-letter queues.
Disaster Recovery — Automated backups, tested restore procedures and documented recovery objectives.
Auditability — Traceable changes for financial, security, access and administrative actions.
Accessibility — Customer and staff interfaces should follow recognized accessibility practices.
Internationalization — Architecture should support additional languages, currencies and malls if future expansion requires it.
Maintainability — Automated tests, code standards, documentation, observability and modular boundaries.
Data Protection — Data minimization, retention policies, access controls and documented processing purposes.
19. Deployment Architecture
•	Public edge: CDN/WAF/load balancer.
•	Web/mobile APIs exposed through an API gateway.
•	Application tier running containerized backend modules.
•	Worker tier for asynchronous jobs, notifications, integrations and analytics ingestion.
•	Event broker for durable events.
•	PostgreSQL cluster with backups and tested recovery.
•	Redis cluster/managed Redis where high availability is required.
•	Object storage for documents, media and evidence references.
•	Search cluster where required.
•	Monitoring and centralized logging stack.
•	Private network connectivity to mall systems such as VMS, access control, parking and Wi-Fi controllers.
•	Administrative access through VPN/zero-trust access controls rather than exposing infrastructure management interfaces publicly.
20. Suggested Repository Structure
bbs-mall-platform/
  apps/
    web/
    customer-mobile/
    tenant-mobile/
    staff-portal/
    security-console/
    signage-console/
  services/
    api/
    workers/
    notifications/
    integrations/
    analytics-ingestion/
  packages/
    ui/
    types/
    api-client/
    auth/
    config/
    validation/
  infrastructure/
    terraform/
    kubernetes/
    monitoring/
  docs/
    architecture/
    api/
    runbooks/
    security/
  tests/
    integration/
    e2e/

21. Implementation Roadmap
Phase 0 — Discovery & Foundation: Detailed requirements, process mapping, UX, data governance, infrastructure, identity, coding standards and integration discovery.
Phase 1 — Core Platform: Mall/property registry, tenant registry, users/roles, leasing, contracts, billing, payments and audit.
Phase 2 — Tenant & Customer Experience: Tenant portal, customer app/web, directory, e-commerce storefronts, notifications and loyalty.
Phase 3 — Parking & Access: Parking management, M-Pesa payment validation, vehicle/plate records, SKIDATA integration and access workflows.
Phase 4 — Facilities & Compliance: Asset management, PPM, corrective maintenance, contracts, permits, utilities, safety and compliance.
Phase 5 — Security Operations: CCTV/VMS integration, security console, incident management, guard tours, playbooks and approved AI event integration.
Phase 6 — Media & Mall Intelligence: Events, digital signage, campaigns, footfall, 3D counting, spatial analytics and executive intelligence.
Phase 7 — Optimization & Expansion: Advanced analytics, additional integrations, performance optimization and preparation for multi-mall rollout.
22. Governance & Operational Model
•	Product ownership should be organized around business domains rather than screens.
•	Every integration should have an owner, contract, monitoring and incident runbook.
•	Production changes should pass automated testing, security checks and controlled deployment.
•	Financial and security functions require stronger approval and audit controls than ordinary content changes.
•	Reference data such as units, floors, tenants and tariffs should have controlled stewardship.
•	Architecture decisions should be documented through Architecture Decision Records (ADRs).
•	API contracts should be versioned and backward compatibility should be managed explicitly.
23. Key Risks and Design Considerations
•	Vendor integrations may have proprietary interfaces; confirm licensed APIs and integration capabilities before committing to exact workflows.
•	Real-time video analytics can be computationally expensive; process events at the edge where appropriate and avoid unnecessarily moving raw video through the central application.
•	Large-scale CCTV storage should remain within the appropriate VMS/storage architecture rather than the transactional application database.
•	Footfall and customer analytics involving identifiable information require privacy-by-design and clearly defined retention/access policies.
•	Microservices should not be introduced solely for fashion; modular architecture can provide many benefits while keeping operational complexity manageable during early phases.
•	Financial reconciliation must be treated as a first-class domain with immutable transaction history.
•	Indoor wayfinding requires accurate floor plans, POIs and vertical-transport metadata; technology cannot compensate for poor source mapping data.
24. Definition of the Target State
The target state is a unified BBS Mall digital ecosystem in which the physical mall and its digital services are represented in one platform. A tenant can be onboarded once and then participate in leasing, billing, communications, compliance, e-commerce and operational services. A customer can discover shops, navigate the mall, shop online, reserve and pay for parking, earn loyalty rewards and receive relevant communications through a consistent identity. Mall management can operate finance, security, facilities, parking, media and compliance from connected operational consoles, while analytics provide a consolidated view of activity across the mall.
25. Recommended Next Engineering Deliverables
17.	Business Requirements Document (BRD) with detailed use cases and acceptance criteria.
18.	Software Requirements Specification (SRS) for each domain.
19.	C4 architecture diagrams: Context, Container, Component and selected Code-level views.
20.	Complete ERD and PostgreSQL schema design.
21.	API specification in OpenAPI format.
22.	Identity/RBAC matrix and permission catalogue.
23.	Integration specifications for M-Pesa, SKIDATA, VMS/CCTV, ANPR, Wi-Fi, SMS, WhatsApp and digital signage.
24.	UX/UI design system and customer/tenant/staff journey maps.
25.	Threat model and security architecture review.
26.	Data protection and retention schedule.
27.	Production infrastructure design, backup/DR plan and observability plan.
28.	Phased implementation backlog with epics, features, stories and acceptance criteria.

End of Document