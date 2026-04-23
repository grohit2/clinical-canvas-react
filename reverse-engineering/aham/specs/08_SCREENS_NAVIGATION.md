# 08 - Screens & Navigation

**Module:** All screens, routing, BLoC state machines, custom widgets, navigation structure
**Source:** Reverse-engineered from `libapp.so` string table + decompiled Dart screen/widget/BLoC classes
**Total Screens:** 32
**Total BLoCs:** 12

---

## 1. Complete Screen Inventory (32 Screens)

### Authentication & Setup

| # | Screen Class | Route | Purpose |
|---|-------------|-------|---------|
| 1 | `LoginScreen` | `/` (initial) | Username/password login |
| 2 | `ClientScreen` | N/A (pushed) | Client/domain configuration |

### Home & Dashboard

| # | Screen Class | Route | Purpose |
|---|-------------|-------|---------|
| 3 | `HomeScreen` | `/home` | Main dashboard with module cards |

### Task Management

| # | Screen Class | Route | Purpose |
|---|-------------|-------|---------|
| 4 | `TaskScreen` | `/task` | Task list with 3 queues (My/Group/All) |
| 5 | `TaskDetailScreen` | N/A (pushed) | Task details with approve/reject/revert actions |
| 6 | `InvoiceDetailScreen` | N/A (pushed) | Invoice document details |
| 7 | `ReceiptDetailScreen` | N/A (pushed) | Receipt document details |
| 8 | `RefundDetailScreen` | N/A (pushed) | Refund document details |
| 9 | `UnbilledDocumentDetailScreen` | N/A (pushed) | Unbilled document details |
| 10 | `HighValueDetailScreen` | N/A (pushed) | High-value medication details |
| 11 | `LchmDetailScreen` | N/A (pushed) | LCHM (Low Cost High Margin) details |
| 12 | `AuthorizationDetailScreen` | N/A (pushed) | Authorization details with amount recalc |

### Chat

| # | Screen Class | Route | Purpose |
|---|-------------|-------|---------|
| 13 | `ChatAssistantScreen` | N/A (pushed) | Conversation list |
| 14 | `ChatScreen` | N/A (pushed) | Individual chat conversation |

### Outreach Camps

| # | Screen Class | Route | Purpose |
|---|-------------|-------|---------|
| 15 | `OutreachHealthCampsScreen` | N/A (pushed) | Camp list |
| 16 | `CampScreen` | N/A (pushed) | Camp overview |
| 17 | `CampDetailScreen` | `/campDetail` | Camp metadata and schedule |
| 18 | `OutreachPatientsScreen` | N/A (pushed) | Patients registered in a camp |
| 19 | `PatientRegistrationScreen` | `/patientRegistration` | Register new patient |
| 20 | `PatientDetailsScreen` | `/patientDetail` | View/edit patient info |
| 21 | `AadharAuthScreen` | N/A (pushed) | Aadhaar KYC capture |

### Settings & Info

| # | Screen Class | Route | Purpose |
|---|-------------|-------|---------|
| 22 | `PreferenceScreen` | N/A (pushed) | User preferences (language, notifications) |
| 23 | `FAQScreen` | `/faq` | FAQ list |
| 24 | `AboutUsScreen` | `/aboutUs` | App information |
| 25 | `PrivacyPolicyScreen` | `/privacyPolicy` | Privacy policy WebView |

### Utility Screens

| # | Screen Class | Route | Purpose |
|---|-------------|-------|---------|
| 26 | `PdfViewerScreen` | N/A (pushed) | PDF document viewer |
| 27 | `ImageViewerScreen` | N/A (pushed) | Full-screen image viewer |
| 28 | `PhotoViewerScreen` | N/A (pushed) | Photo gallery viewer |
| 29 | `PrintScreen` | N/A (pushed) | Print preview and print action |
| 30 | `SelectedImageToSendScreen` | N/A (pushed) | Preview image before sending in chat |
| 31 | `SelectedDocToSendScreen` | N/A (pushed) | Preview document before sending in chat |
| 32 | `NoRecordScreen` | N/A (widget) | Empty state placeholder |

---

## 2. Route Map

| Route Path | Screen | Parameters |
|------------|--------|------------|
| `/home` | `HomeScreen` | none |
| `/task` | `TaskScreen` | optional: taskType filter |
| `/faq` | `FAQScreen` | none |
| `/faqCategory` | `FAQScreen` (category) | category identifier |
| `/aboutUs` | `AboutUsScreen` | none |
| `/privacyPolicy` | `PrivacyPolicyScreen` | none |
| `/campDetail` | `CampDetailScreen` | campId, campScheduleId |
| `/patientRegistration` | `PatientRegistrationScreen` | campId, campScheduleId |
| `/patientDetail` | `PatientDetailsScreen` | patientId, campId |
| `/editPatient` | `PatientDetailsScreen` (edit mode) | patientId, campId |

Named routes use `Navigator.pushNamed()`. Non-routed screens use `Navigator.push()` with `MaterialPageRoute`.

---

## 3. All 12 BLoC State Machines

### 3.1 LoginBloc

```
LoginButtonPressed ──→ LoginLoading ──→ LoginSuccess
                                    └──→ LoginFailure { errorCode }
```

### 3.2 AuthenticationBloc

```
AppStarted ──→ Authenticated
            └──→ Unauthenticated

LoggedOut ──→ Unauthenticated

TokenRefreshed ──→ Authenticated
               └──→ Unauthenticated
```

### 3.3 ClientSetupBloc

```
VerifyClientEvent ──→ ClientSetupLoadingState ──→ ClientSetupSuccessState
                                               └──→ ClientSetupErrorState
                                               └──→ ClientBaseUrlSettingState
```

### 3.4 TaskBloc

```
LoadModuleTask ──→ TaskLoadingState ──→ TaskLoadedState { tasks }
                                    └──→ TaskErrorState { message }

RefreshTasksEvent ──→ TaskLoadingState ──→ TaskLoadedState
                                       └──→ TaskErrorState
```

### 3.5 TaskDetailBloc

```
LoadTaskDetail ──→ TaskDetailLoadingState ──→ TaskDetailLoadedState
                                           └──→ TaskDetailLoadingErrorState

ClaimButtonPressed ──→ ClaimTaskLoadingState ──→ ClaimTaskSuccessState
                                              └──→ ClaimTaskErrorState

ApproveORRejectButtonPressed ──→ ApproveTaskLoadingState ──→ ApproveTaskSuccessState
                                                          └──→ TaskActionError

RevertButtonPressed ──→ RevertTaskLoadingState ──→ RevertTaskSuccessState
                                                └──→ RevertTaskErrorState

ShowRevertActionDialogBox ──→ (shows confirmation dialog before RevertButtonPressed)
```

### 3.6 ChatAssistantBloc

```
Events:
  ├── FetchAllConversation
  ├── FetchMyConversation
  ├── FetchUserChatConversationSummary
  ├── FetchChatDataToView
  ├── DeleteChatMessage
  ├── AssignChatConversation
  ├── DelegateConversationEvent
  ├── CloseConversationEvent
  └── SendMessageEvent

States:
  ├── ChatAssistanceInitialState
  ├── AllConversationsLoadedState
  ├── MyConversationsLoadedState
  ├── ChatDataLoadedState
  ├── ChatConversationAssignedState
  ├── ConversationsLoadingState
  ├── ConversationsErrorState
  ├── AssignLoadingState
  ├── AssignSuccessState
  ├── AssignErrorState
  ├── DelegateLoadingState
  ├── DelegateSuccessState
  ├── DelegateErrorState
  ├── CloseLoadingState
  ├── CloseSuccessState
  ├── CloseErrorState
  ├── SendMessageLoadingState
  ├── SendMessageSuccessState
  └── SendMessageErrorState
```

### 3.7 OutreachCampsBloc

```
FetchOutreachCamps ──→ OutreachCampsLoadingState ──→ OutreachCampsLoadedState
                                                  └──→ OutreachCampsErrorState

StartCampEvent ──→ StartCampStateLoading ──→ StartCampStateSuccess
                                          └──→ StartCampStateError4

FetchCampPatientsEvent ──→ FetchCampPatientsStateLoading ──→ FetchCampPatientsStateSuccess
                                                          └──→ FetchCampPatientsStateError
```

### 3.8 PatientRegistrationBloc

```
SearchPatient ──→ SearchPatientLoading ──→ SearchPatientSuccess
                                       └──→ SearchPatientFailure

RegisterPatient ──→ PatientRegistrationLoadingState ──→ PatientRegistrationSuccessState
                                                    └──→ PatientRegistrationFailureState

FetchConsultants ──→ FetchConsultantsLoading ──→ FetchConsultantsSuccess
                                              └──→ FetchConsultantsFailure

SearchCoOrdinator ──→ SearchCoOrdinatorsLoading ──→ SearchCoOrdinatorsSuccess
                                                 └──→ SearchCoOrdinatorsFailure

UpdateCoOrdinator ──→ UpdateCoOrdinatorsLoading ──→ UpdateCoOrdinatorsSuccess
                                                 └──→ UpdateCoOrdinatorsFailure

SearchZipCodesEvent ──→ (zip code search for patient address)

FetchOverBookingSlotsEvent ──→ FetchOverBookingSlotsStateLoading ──→ FetchOverBookingSlotsStateSuccess
                                                                  └──→ FetchOverBookingSlotsStateError

FileDownloadEvent ──→ FileDownloadLoading ──→ FileDownloadSuccess
                                           └──→ FileDownloadFailure

FileUploadEvent ──→ FileUploadLoading ──→ FileUploadSuccess
                                       └──→ FileUploadFailure
```

### 3.9 PreferenceBloc

```
LoadPreferences ──→ PreferenceIntialState ──→ PreferenceLoadedState
                                           └──→ PreferenceFailedState

SavePreferences ──→ PreferenceSavingState ──→ PreferenceSavedState
                                           └──→ PreferenceFailedState
```

### 3.10 UserProfileBloc

```
FetchUserProfile ──→ UserProfileLoading ──→ UserProfileLoaded
                                         └──→ UserProfileError
```

### 3.11 FAQBloc

```
FetchFAQ ──→ FAQsFetched
          └──→ FAQEmpty
          └──→ FAQError
```

### 3.12 AadharBloc

```
Events:
  └── AuthenticateAadhar

States:
  ├── AadharInitial
  ├── AadharLoading
  ├── AadharSuccess
  └── AadharFailure
```

---

## 4. Custom Widgets

### Task Widgets

| Widget | Purpose | Used In |
|--------|---------|---------|
| `AppBarTaskFilter` | Filter toggle in app bar (My Tasks / Group Tasks / All Tasks) | `TaskScreen` |
| `BadgeWidget` | Notification count badge overlay | `HomeScreen`, `TaskScreen` |
| `ReassignWidget` | Task reassignment UI with user search | `TaskDetailScreen` |

### Chat Widgets

| Widget | Purpose | Used In |
|--------|---------|---------|
| `ConversationInfoTileWidget` | Conversation list item with status, unread count | `ChatAssistantScreen` |
| `ChatAttachmentWidget` | Attachment preview (image/doc/audio) in chat | `ChatScreen` |
| `ChatTimeWidget` | Formatted timestamp display | `ChatScreen` |
| `AudioPlayerWidget` | Inline audio playback controls | `ChatScreen` |
| `NoConversationFoundWidget` | Empty state for no conversations | `ChatAssistantScreen` |

### Camp Widgets

| Widget | Purpose | Used In |
|--------|---------|---------|
| `CampWidgetItem` | Camp list card with status, consultant count | `OutreachHealthCampsScreen` |
| `PatientCardWidget` | Patient info card in camp patient list | `OutreachPatientsScreen` |
| `ManageCoordinatorsSheet` | Bottom sheet for add/remove coordinators | `CampScreen` |
| `ConsultantAvatars` | Stacked circular avatars for assigned consultants | `CampWidgetItem` |

### Chat Extended Widgets

| Widget | Purpose | Used In |
|--------|---------|---------|
| `ChatScreenContentWidget` | Main chat content area | `ChatScreen` |
| `CustomChatAppbar` | Custom app bar for chat | `ChatScreen` |
| `MoreOptionWidget` | More options menu in chat | `ChatScreen` |
| `MultiImageWidget` | Multi-image display | `ChatScreen` |

### Shared Widgets

| Widget | Purpose | Used In |
|--------|---------|---------|
| `CustomBottomSheet` | Shared bottom sheet | Multiple screens |
| `CustomTextField` | Shared text field | Multiple screens |
| `CustomGestureScaleWidget` | Gesture scaling (pinch-to-zoom) | `ImageViewerScreen`, `PhotoViewerScreen` |
| `GlowingOverscrollWidget` | Overscroll effect | Multiple screens |
| `FlutterSwitch` | Toggle switch | `PreferenceScreen` |
| `ExpandableButton` | Expandable action button | Multiple screens |
| `ConnectorWidget` | Connector/timeline element | Task detail screens |

### Camp/Outreach Extended Widgets

| Widget | Purpose | Used In |
|--------|---------|---------|
| `StatusWidget` | Status indicator | `OutreachHealthCampsScreen` |
| `PatientDocumentCarouselWidget` | Document carousel | `PatientDetailsScreen` |
| `PatientDocumentImageWidget` | Document image display | `PatientDetailsScreen` |

### Home Extended Widgets

| Widget | Purpose | Used In |
|--------|---------|---------|
| `HomeCard` | Module card on home dashboard | `HomeScreen` |
| `HomeListTile` | List tile for home | `HomeScreen` |

### FAQ & Info Widgets

| Widget | Purpose | Used In |
|--------|---------|---------|
| `FAQCategoryList` | FAQ category grouping | `FAQScreen` |
| `HcciPrivacyPolicyWidget` | Privacy policy content | `PrivacyPolicyScreen` |

### Utility Widgets

| Widget | Purpose | Used In |
|--------|---------|---------|
| `CustomDashBorderWidget` | Dashed border container (upload areas) | `PatientRegistrationScreen`, `AadharAuthScreen` |
| `NoRecordScreen` | Generic empty state with illustration | Multiple screens |

---

## 5. Home Dashboard

### Module Cards

The `HomeScreen` displays a grid of module cards. Each card navigates to its respective module.

```
┌──────────────────────────────────────┐
│            AHAM Dashboard            │
├──────────┬──────────┬────────────────┤
│          │          │                │
│  TASKS   │   CHAT   │    CAMPS       │
│  (badge) │  (badge) │                │
│          │          │                │
├──────────┴──────────┴────────────────┤
│                                      │
│         Additional cards             │
│         based on user role           │
│                                      │
└──────────────────────────────────────┘
```

Card visibility is role-based; not all users see all modules.

---

## 6. Menu / Drawer Structure

```
Navigation Drawer
│
├── Home (/home)
│
├── Tasks (/task)
│
├── Chat Conversations
│
├── Outreach Health Camps
│
├── Settings
│   ├── Preferences
│   └── User Profile
│
├── Help
│   ├── FAQ (/faq)
│   └── About Us (/aboutUs)
│
├── Privacy Policy (/privacyPolicy)
│
└── Logout
```

---

## 7. Navigation Patterns

### Push Patterns

```
Named Route Push:
  Navigator.pushNamed(context, '/task')

Material Route Push (non-routed):
  Navigator.push(context, MaterialPageRoute(
    builder: (context) => ChatScreen(threadId: id)
  ))

Replacement Push (login → home):
  Navigator.pushReplacementNamed(context, '/home')

Pop to Root (logout):
  Navigator.pushNamedAndRemoveUntil(context, '/', (route) => false)
```

### Deep Linking

Push notification taps route to specific screens:
- Task notification → `TaskDetailScreen` with task ID
- Chat notification → `ChatScreen` with thread ID
- Camp notification → `CampScreen` with camp ID

### Screen Lifecycle

```
Screen Created
    │
    ▼
BLoC Provider injected (MultiBlocProvider or BlocProvider)
    │
    ▼
Initial event dispatched in initState()
    │
    ▼
BlocBuilder/BlocListener renders UI based on state
    │
    ▼
User interactions dispatch new events
    │
    ▼
Screen disposed → BLoC closed
```

---

## 8. Screen-to-BLoC Mapping

| Screen | BLoC(s) Used |
|--------|-------------|
| `LoginScreen` | `LoginBloc` |
| `HomeScreen` | `AuthenticationBloc` |
| `ClientScreen` | `ClientSetupBloc` |
| `PreferenceScreen` | `PreferenceBloc` |
| `TaskScreen` | `TaskBloc` |
| `TaskDetailScreen` | `TaskDetailBloc` |
| `InvoiceDetailScreen` | `TaskDetailBloc` |
| `ReceiptDetailScreen` | `TaskDetailBloc` |
| `RefundDetailScreen` | `TaskDetailBloc` |
| `UnbilledDocumentDetailScreen` | `TaskDetailBloc` |
| `HighValueDetailScreen` | `TaskDetailBloc` |
| `LchmDetailScreen` | `TaskDetailBloc` |
| `AuthorizationDetailScreen` | `TaskDetailBloc` |
| `ChatAssistantScreen` | `ChatAssistantBloc` |
| `ChatScreen` | `ChatAssistantBloc` |
| `OutreachHealthCampsScreen` | `OutreachCampsBloc` |
| `CampScreen` | `OutreachCampsBloc` |
| `CampDetailScreen` | `OutreachCampsBloc` |
| `OutreachPatientsScreen` | `OutreachCampsBloc` |
| `PatientRegistrationScreen` | `PatientRegistrationBloc` |
| `PatientDetailsScreen` | `PatientRegistrationBloc` |
| `AadharAuthScreen` | `AadharBloc` |
| `FAQScreen` | `FAQBloc` |
| `AboutUsScreen` | (none - static) |
| `PrivacyPolicyScreen` | (none - WebView) |
| `PdfViewerScreen` | (none - viewer) |
| `ImageViewerScreen` | (none - viewer) |
| `PhotoViewerScreen` | (none - viewer) |
| `PrintScreen` | (none - utility) |
| `SelectedImageToSendScreen` | `ChatAssistantBloc` |
| `SelectedDocToSendScreen` | `ChatAssistantBloc` |
| `NoRecordScreen` | (none - widget) |
