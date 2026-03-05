# Düzeltici Faaliyet İsteği (CAR) Modülü - Kapsamlı Uygulama Planı

## Genel Bakış

QMS sistemine yeni bir alt modül: **Corrective Action Request (CAR) / Düzeltici Faaliyet İsteği (DFİ)**. DMS modülü ile aynı kullanıcı ve departman altyapısını paylaşacak, ancak kendi iş akışı, kontrol paneli ve raporlamaları olacak.

## Mimari Kararlar

| Karar | Seçim | Gerekçe |
|-------|-------|---------|
| Lookup tablolar | Admin-yönetimli ayrı tablolar | Raporlama tutarlılığı, FK constraint |
| KG Onayı | user_permissions tablosu | Genişletilebilir, rol bağımsız |
| Çoklu DF | Evet, her DFİ'de N adet | Gerçek dünya ihtiyacı |
| PDF Oluşturma | Otomatik | GÜRAL logo + form kodu |
| Workflow | 7 aşamalı detaylı | OPEN -> ... -> CLOSED |
| Numaralama | Hybrid (DMS gibi) | Otomatik öneri + kullanıcı düzenleme |
| Bildirim Kaynakları | Admin tanımlı (seed data ile) | Esneklik |
| Hatırlatıcı | BullMQ + cron (DMS gibi) | Mevcut altyapı |
| Sidebar | Ayrı "Düzeltici Faaliyet" grubu | Net modül ayrımı |
| Ayarlar | Mevcut settings'e tab | Tek yönetim noktası |
| DMS Entegrasyonu | Otomatik referans | PDF header'da doküman kodu |

---

## Faz 1: Veritabanı Şeması & Lookup Yönetimi

### 1.1 Yeni Drizzle Schema Dosyaları

#### `src/lib/db/schema/car-lookups.ts` - Lookup Tabloları

```
car_sources (Bildirim Kaynakları)
├── id: text (PK, nanoid)
├── name: text (NOT NULL, UNIQUE)
├── isActive: boolean (DEFAULT true)
├── sortOrder: integer (DEFAULT 0)
├── isDeleted: boolean (DEFAULT false)
├── deletedAt: timestamp (nullable)
├── createdAt: timestamp
└── updatedAt: timestamp

car_systems (Sistemler) - aynı yapı
car_processes (Süreçler) - aynı yapı
car_customers (Müşteriler) - aynı yapı
car_products (Ürünler) - aynı yapı
car_operations (Operasyonlar) - aynı yapı
```

#### `src/lib/db/schema/user-permissions.ts` - İzin Tablosu

```
user_permissions
├── id: text (PK, nanoid)
├── userId: text (FK -> users.id, NOT NULL)
├── permission: text (NOT NULL) -- 'CLOSE_CAR', ileride: 'MANAGE_SETTINGS' vb.
├── grantedById: text (FK -> users.id, NOT NULL)
├── createdAt: timestamp
UNIQUE(userId, permission)
INDEX: userId, permission
```

#### `src/lib/db/schema/corrective-action-requests.ts` - Ana DFİ Tablosu

```
corrective_action_requests
├── id: text (PK, nanoid)
├── carCode: text (NOT NULL, UNIQUE) -- Hybrid: DF-2026-1
├── status: enum (OPEN, ROOT_CAUSE_ANALYSIS, IMMEDIATE_ACTION, PLANNED_ACTION, ACTION_RESULTS, PENDING_CLOSURE, CLOSED, CANCELLED)
├── sourceId: text (FK -> car_sources.id, NOT NULL) -- Bildirim Kaynağı
├── systemId: text (FK -> car_systems.id, nullable)
├── processId: text (FK -> car_processes.id, nullable)
├── customerId: text (FK -> car_customers.id, nullable)
├── productId: text (FK -> car_products.id, nullable)
├── operationId: text (FK -> car_operations.id, nullable)
├── relatedStandard: text (nullable) -- Uygunsuzluğun ilişkili standardı ve maddesi
├── nonconformityDescription: text (NOT NULL) -- Uygunsuzluk tanımı
├── requesterId: text (FK -> users.id, NOT NULL) -- DFİ açan kişi
├── requesterDepartmentId: text (FK -> departments.id, NOT NULL) -- Talebi açan birim
├── responsibleDepartmentId: text (FK -> departments.id, NOT NULL) -- Sorumlu birim
├── assigneeId: text (FK -> users.id, NOT NULL) -- DFİ açılacak kullanıcı
├── targetCompletionDate: date (NOT NULL) -- Hedef tamamlanma tarihi
├── closingDate: timestamp (nullable) -- Kapanış tarihi
├── closedById: text (FK -> users.id, nullable) -- Kapatan kişi
├── closingApprovalNote: text (nullable)
├── dmsDocumentId: text (FK -> documents.id, nullable) -- DMS form referansı
├── isDeleted: boolean (DEFAULT false)
├── deletedAt: timestamp (nullable)
├── createdAt: timestamp
└── updatedAt: timestamp

INDEXES: status, sourceId, requesterId, assigneeId, requesterDepartmentId, responsibleDepartmentId, targetCompletionDate, isDeleted
```

#### `src/lib/db/schema/car-root-cause.ts` - Kök Neden Analizi

```
car_root_cause_analyses
├── id: text (PK, nanoid)
├── carId: text (FK -> corrective_action_requests.id, NOT NULL)
├── description: text (NOT NULL)
├── createdById: text (FK -> users.id, NOT NULL)
├── createdAt: timestamp
└── updatedAt: timestamp

INDEX: carId
```

#### `src/lib/db/schema/car-immediate-actions.ts` - Acil Aksiyon

```
car_immediate_actions
├── id: text (PK, nanoid)
├── carId: text (FK -> corrective_action_requests.id, NOT NULL)
├── description: text (NOT NULL)
├── createdById: text (FK -> users.id, NOT NULL)
├── createdAt: timestamp
└── updatedAt: timestamp

INDEX: carId
```

#### `src/lib/db/schema/car-corrective-actions.ts` - Düzeltici Faaliyetler

```
car_corrective_actions
├── id: text (PK, nanoid)
├── carId: text (FK -> corrective_action_requests.id, NOT NULL)
├── description: text (NOT NULL) -- Faaliyet tanımı
├── ownerId: text (FK -> users.id, NOT NULL) -- Faaliyet sahibi
├── targetDate: date (NOT NULL) -- Termin tarihi
├── status: enum (OPEN, IN_PROGRESS, COMPLETED, CANCELLED)
├── completedAt: timestamp (nullable)
├── results: text (nullable) -- Faaliyet sonuçları
├── cost: numeric(12,2) (nullable) -- Maliyet
├── createdById: text (FK -> users.id, NOT NULL)
├── isDeleted: boolean (DEFAULT false)
├── deletedAt: timestamp (nullable)
├── createdAt: timestamp
└── updatedAt: timestamp

INDEXES: carId, ownerId, status, targetDate
```

#### `src/lib/db/schema/car-action-team.ts` - Faaliyet Ekibi

```
car_corrective_action_team
├── id: text (PK, nanoid)
├── correctiveActionId: text (FK -> car_corrective_actions.id, NOT NULL)
├── userId: text (FK -> users.id, NOT NULL)
├── createdAt: timestamp

UNIQUE(correctiveActionId, userId)
INDEXES: correctiveActionId, userId
```

#### `src/lib/db/schema/car-attachments.ts` - Ekler

```
car_attachments
├── id: text (PK, nanoid)
├── carId: text (FK -> corrective_action_requests.id, NOT NULL)
├── correctiveActionId: text (FK -> car_corrective_actions.id, nullable)
├── section: enum (REQUEST, ROOT_CAUSE, IMMEDIATE_ACTION, CORRECTIVE_ACTION, CLOSURE)
├── filePath: text (NOT NULL)
├── fileName: text (NOT NULL)
├── fileSize: integer (nullable)
├── mimeType: text (nullable)
├── uploadedById: text (FK -> users.id, NOT NULL)
├── createdAt: timestamp

INDEXES: carId, correctiveActionId, section
```

#### `src/lib/db/schema/car-notification-users.ts` - Bilgilendirilecek Kullanıcılar

```
car_notification_users
├── id: text (PK, nanoid)
├── carId: text (FK -> corrective_action_requests.id, NOT NULL)
├── userId: text (FK -> users.id, NOT NULL)
├── createdAt: timestamp

UNIQUE(carId, userId)
INDEXES: carId, userId
```

#### `src/lib/db/schema/car-activity-logs.ts` - Aktivite Logları

```
car_activity_logs
├── id: text (PK, nanoid)
├── carId: text (FK -> corrective_action_requests.id, NOT NULL)
├── correctiveActionId: text (FK -> car_corrective_actions.id, nullable)
├── userId: text (FK -> users.id, NOT NULL)
├── action: enum (CREATED, UPDATED, STATUS_CHANGED, ROOT_CAUSE_ADDED, IMMEDIATE_ACTION_ADDED, ACTION_ADDED, ACTION_COMPLETED, CLOSURE_REQUESTED, CLOSED, REOPENED, CANCELLED, DELETED, ATTACHMENT_ADDED, TEAM_MEMBER_ADDED)
├── details: jsonb (nullable)
├── createdAt: timestamp

INDEXES: carId, userId, action, (carId, createdAt), (userId, createdAt)
```

### 1.2 Seed Data

```typescript
// Bildirim Kaynakları
["İç Tetkik", "İç Uygunsuzluk", "Müşteri Şikayeti", "Dış Tetkik", "Proses Hatası", "Tedarikçi Uygunsuzluğu", "Diğer"]

// Sistemler
["Kalite Yönetim Sistemi", "Çevre Yönetim Sistemi", "İSG Yönetim Sistemi", "Entegre Yönetim Sistemi"]

// Süreçler
["Üretim Planlama", "Satınalma", "Depolama ve Sevkiyat", "Kalite Kontrol", "ArGe", "İnsan Kaynakları", "Bakım"]

// Müşteriler, Ürünler, Operasyonlar: Boş başlar, admin tanımlar
```

### 1.3 Settings Sayfası - CAR Tab

**Route**: `/settings` (mevcut sayfa, yeni tab)

**Tab İçeriği**: "DF Ayarları"
- Bildirim Kaynakları CRUD tablosu
- Sistemler CRUD tablosu
- Süreçler CRUD tablosu
- Müşteriler CRUD tablosu
- Ürünler CRUD tablosu
- Operasyonlar CRUD tablosu
- Hatırlatıcı ayarları (gün sayısı, escalation)
- DMS Form Şablonu referansı (dropdown - mevcut DMS dokümanları)

### 1.4 Kullanıcı İzinleri UI

**Route**: `/users/[id]` (mevcut user detail, düzenleme dialog'una ek)

Admin kullanıcı düzenlerken:
- [x] DFİ Kapatma Yetkisi (CLOSE_CAR permission)

---

## Faz 2: Temel CAR Modülü - Oluşturma & Listeleme

### 2.1 Sidebar Güncelleme

```
DMS
  Kontrol Paneli (/dashboard)
  Dokümanlar (/documents)
  Onay Bekleyenler (/approvals)
  Okuma Görevleri (/read-tasks)

Düzeltici Faaliyet
  Kontrol Paneli (/car/dashboard)
  DFİ Listesi (/car)
  Görevlerim (/car/my-tasks)

Yönetim (ADMIN)
  Departmanlar (/departments)
  Kullanıcılar (/users)
  Ayarlar (/settings)
```

### 2.2 DFİ Oluşturma Sayfası

**Route**: `/car/create`

**Form Alanları (Üst Bölüm - DFİ Bilgileri)**:
| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| DFİ No | Text (hybrid) | Evet | Otomatik öneri: DF-{YIL}-{SIRA}, kullanıcı düzenleyebilir |
| DFİ Nedeni | Dropdown (car_sources) | Evet | Bildirim Kaynağı |
| Sistem | Dropdown (car_systems) | Hayır | |
| Süreç | Dropdown (car_processes) | Hayır | |
| DFİ Açılacak Kullanıcı | User picker | Evet | Sorumlu kişi |
| Talebi Açan Birim | Dropdown (departments) | Evet | Auto-fill: oturum açan kullanıcının departmanı |
| Faaliyeti Yürütmekle Sorumlu Birim | Dropdown (departments) | Evet | |
| Hedef Tamamlanma Tarihi | Date picker | Evet | |
| Uygunsuzluk Tanımı | Textarea (2000 karakter) | Evet | |
| Müşteri | Dropdown (car_customers) | Hayır | |
| Ürün | Dropdown (car_products) | Hayır | |
| Operasyon | Dropdown (car_operations) | Hayır | |
| Uygunsuzluğun İlişkili Standardı | Text | Hayır | |
| Bilgilendirilecek Kullanıcılar | Multi-user picker | Hayır | |
| Ekler | File upload (çoklu) | Hayır | |

**İşlemler**: Kaydet (Draft), Kaydet ve Gönder (OPEN status)

### 2.3 DFİ Listesi Sayfası

**Route**: `/car`

**Tablo Sütunları** (TanStack Table):
| Sütun | Açıklama |
|-------|----------|
| DF No | carCode, link to detail |
| Tarih | createdAt |
| Bildirim Kaynağı | source.name |
| Talebi Açan Birim | requesterDepartment.name |
| Sorumlu Birim | responsibleDepartment.name |
| Sorumlu Kişi | assignee.name |
| Hedef Tarihi | targetCompletionDate |
| Kapanış Tarihi | closingDate |
| Durum | status badge (renkli) |
| Onay | closedBy info veya "-" |

**Filtreler**:
- Arama (carCode, uygunsuzluk tanımı)
- Durum (çoklu seçim)
- Bildirim Kaynağı
- Talebi Açan Birim
- Sorumlu Birim
- Tarih aralığı
- Hedef tarihi (geçmiş/gelecek)

**Status Badge Renkleri**:
- OPEN: Mavi
- ROOT_CAUSE_ANALYSIS: Turuncu
- IMMEDIATE_ACTION: Turuncu
- PLANNED_ACTION: Sarı
- ACTION_RESULTS: Sarı
- PENDING_CLOSURE: Mor
- CLOSED: Yeşil
- CANCELLED: Gri

**Süre Durumu**:
- Süresi Geçti (kırmızı badge): targetCompletionDate < now && status !== CLOSED
- Beklemede (sarı badge): PENDING_CLOSURE
- Onayda (yeşil badge): CLOSED

### 2.4 DFİ Detay Sayfası

**Route**: `/car/[id]`

**Bölümler**:

**1. Üst Bilgi Kartı**:
- DFİ No, Tarih, Durum badge
- Açan kişi, Talebi Açan Birim, Sorumlu Birim, Sorumlu Kişi
- Bildirim Kaynağı, Sistem, Süreç
- Hedef Tarihi, Kapanış Tarihi
- Müşteri, Ürün, Operasyon
- İlişkili Standard
- Bilgilendirilecek kullanıcılar
- Ekler (indirilebilir)

**2. Kök Neden Analizi Kartı** (editable when status >= ROOT_CAUSE_ANALYSIS):
- Açıklama textarea
- Ekler
- Düzenle/Kaydet butonları

**3. Acil Aksiyon Kartı** (editable when status >= IMMEDIATE_ACTION):
- Açıklama textarea
- Ekler
- Düzenle/Kaydet butonları

**4. Düzeltici Faaliyet Listesi Kartı** (editable when status >= PLANNED_ACTION):
- Tablo: No, Faaliyet Tanımı, Sahibi, Ekip, Termin Tarihi, Durum
- Yeni Faaliyet Ekle butonu (dialog)
- Her faaliyet düzenlenebilir
- Faaliyet detay dialog: sonuçlar, maliyet, ekler

**5. Takip ve Kapatma Kartı** (visible when status = PENDING_CLOSURE or CLOSED):
- Kapanış Tarihi
- Kapatma Sorumlusu (KG yetkili kişi)
- Maliyet (toplam)
- Açıklama
- Ekler
- Onay butonu (sadece CLOSE_CAR yetkisi olan kullanıcılar)

**6. Aktivite Geçmişi Kartı**:
- Timeline görünümü
- Tüm durum değişiklikleri, eklemeler, güncellemeler

**Aksiyon Butonları** (context-dependent):
- İleri: Sonraki aşamaya geç (workflow ilerlet)
- Reddet: Önceki aşamaya geri gönder (KG onay aşamasında)
- PDF İndir
- Düzenle (DFİ bilgilerini güncelle)
- İptal Et (CANCELLED)
- Sil (soft delete, sadece ADMIN)

---

## Faz 3: Workflow & Server Actions

### 3.1 Durum Makinesi

```
OPEN (DFİ açıldı)
  -> ROOT_CAUSE_ANALYSIS (Kök neden analizi aşaması)
    -> IMMEDIATE_ACTION (Acil aksiyon aşaması)
      -> PLANNED_ACTION (Planlanan faaliyetler aşaması)
        -> ACTION_RESULTS (Faaliyet sonuçları aşaması)
          -> PENDING_CLOSURE (Kapatma bekliyor - KG onayı)
            -> CLOSED (KG onayladı - kapalı)
            -> ACTION_RESULTS (KG reddetti - geri gönderildi)

Herhangi bir aşamadan:
  -> CANCELLED (iptal edildi)
```

**Geçiş Kuralları**:
| Geçiş | Kim Yapabilir |
|--------|--------------|
| OPEN -> ROOT_CAUSE_ANALYSIS | Sorumlu kişi (assignee) veya ADMIN |
| ROOT_CAUSE_ANALYSIS -> IMMEDIATE_ACTION | Sorumlu kişi + kök neden doldurulmuş olmalı |
| IMMEDIATE_ACTION -> PLANNED_ACTION | Sorumlu kişi + acil aksiyon doldurulmuş olmalı |
| PLANNED_ACTION -> ACTION_RESULTS | Sorumlu kişi + en az 1 faaliyet eklenmiş olmalı |
| ACTION_RESULTS -> PENDING_CLOSURE | Sorumlu kişi + tüm faaliyetler COMPLETED olmalı |
| PENDING_CLOSURE -> CLOSED | CLOSE_CAR permission sahibi |
| PENDING_CLOSURE -> ACTION_RESULTS | CLOSE_CAR permission sahibi (red) |
| Any -> CANCELLED | ADMIN veya DFİ açan kişi |

### 3.2 Server Actions

#### `src/actions/car.ts` - Ana CRUD
- `createCar(formData)` - DFİ oluşturma
- `updateCar(id, formData)` - DFİ güncelleme
- `getCars(filters)` - Sayfalı liste
- `getCarById(id)` - Detay
- `getCarByCode(code)` - Code ile detay
- `deleteCar(id)` - Soft delete
- `suggestCarCode()` - Sonraki kod önerisi
- `advanceCarStatus(id)` - Sonraki aşamaya geç
- `rejectCarClosure(id, comment)` - KG red
- `closeCar(id, note)` - KG onay
- `cancelCar(id, reason)` - İptal

#### `src/actions/car-root-cause.ts`
- `saveRootCause(carId, description)` - Kök neden kaydet/güncelle
- `getRootCause(carId)` - Kök neden getir

#### `src/actions/car-immediate-action.ts`
- `saveImmediateAction(carId, description)` - Acil aksiyon kaydet/güncelle
- `getImmediateAction(carId)` - Acil aksiyon getir

#### `src/actions/car-corrective-actions.ts`
- `createCorrectiveAction(carId, data)` - Yeni faaliyet
- `updateCorrectiveAction(actionId, data)` - Faaliyet güncelle
- `completeCorrectiveAction(actionId, results, cost)` - Faaliyet tamamla
- `deleteCorrectiveAction(actionId)` - Faaliyet sil
- `getCorrectiveActions(carId)` - Faaliyet listesi
- `addTeamMember(actionId, userId)` - Ekip üyesi ekle
- `removeTeamMember(actionId, userId)` - Ekip üyesi çıkar

#### `src/actions/car-attachments.ts`
- `uploadAttachment(carId, section, file, actionId?)` - Dosya yükle
- `deleteAttachment(attachmentId)` - Dosya sil
- `getAttachments(carId, section?)` - Dosya listesi

#### `src/actions/car-dashboard.ts`
- `getCarDashboardStats()` - İstatistikler
- `getCarRecentActivity()` - Son aktiviteler
- `getCarStatusDistribution()` - Durum dağılımı
- `getCarByDepartmentStats()` - Departman bazlı
- `getCarBySourceStats()` - Kaynak bazlı
- `getCarTimelineStats()` - Zaman bazlı (aylık trend)
- `getCarOverdueList()` - Süresi geçenler
- `getUserCarStats(userId)` - Kullanıcı bazlı CAR istatistikleri
- `getDepartmentCarStats(departmentId)` - Departman bazlı CAR istatistikleri

#### `src/actions/car-settings.ts`
- `getLookupItems(type)` - Lookup listesi
- `createLookupItem(type, name)` - Yeni kayıt
- `updateLookupItem(id, type, data)` - Güncelle
- `deleteLookupItem(id, type)` - Soft delete
- `getCarSettings()` - CAR ayarları
- `updateCarSettings(data)` - Ayarları güncelle

#### `src/actions/user-permissions.ts`
- `getUserPermissions(userId)` - Kullanıcı izinleri
- `grantPermission(userId, permission)` - İzin ver
- `revokePermission(userId, permission)` - İzin al
- `hasPermission(userId, permission)` - İzin kontrol

---

## Faz 4: Bildirimler & Hatırlatıcılar

### 4.1 Bildirim Türleri (Notification Types)

Mevcut notification type enum'a eklenecekler:
- `CAR_CREATED` - DFİ oluşturuldu (sorumlu kişiye)
- `CAR_STATUS_CHANGED` - DFİ durumu değişti
- `CAR_ACTION_ASSIGNED` - Düzeltici faaliyet atandı
- `CAR_ACTION_COMPLETED` - Faaliyet tamamlandı
- `CAR_CLOSURE_REQUESTED` - Kapatma onayı bekliyor (KG yetkililere)
- `CAR_CLOSED` - DFİ kapatıldı (açan kişi + sorumlu + bilgilendirilecekler)
- `CAR_REJECTED` - KG kapatmayı reddetti
- `CAR_REMINDER` - Hatırlatıcı (hedef tarih yaklaşıyor)
- `CAR_OVERDUE` - Süresi geçti
- `CAR_ESCALATION` - Escalation (üst yönetime)

### 4.2 Email Şablonları

`src/lib/email/templates/`:
- `car-created.tsx` - DFİ oluşturuldu
- `car-status-changed.tsx` - Durum değişikliği
- `car-action-assigned.tsx` - Faaliyet ataması
- `car-closure-requested.tsx` - Kapatma onayı
- `car-closed.tsx` - DFİ kapatıldı
- `car-rejected.tsx` - KG red
- `car-reminder.tsx` - Hatırlatıcı
- `car-overdue.tsx` - Süresi geçti
- `car-escalation.tsx` - Escalation

### 4.3 BullMQ Job'ları

`src/lib/queue/`:
- CAR reminder job: Her gün çalışır, hedef tarihine X gün kalan DFİ'ler için hatırlatıcı
- CAR overdue job: Her gün çalışır, süresi geçen DFİ'leri işaretle
- CAR escalation job: Süresi N gün geçen DFİ'ler için üst yönetime escalation

### 4.4 SSE Integration

Mevcut Redis Pub/Sub kanallarına ek:
- `CHANNELS.car` - CAR modülü gerçek zamanlı güncellemeler
- `CHANNELS.carNotifications(userId)` - Kullanıcıya özel CAR bildirimleri

---

## Faz 5: Kontrol Paneli & Raporlama

### 5.1 CAR Kontrol Paneli

**Route**: `/car/dashboard`

**İstatistik Kartları** (üst sıra, 4-5 kart):
| Kart | İçerik | Renk |
|------|--------|------|
| Toplam DFİ | Tüm DFİ sayısı | Mavi |
| Açık DFİ | CLOSED/CANCELLED dışındakiler | Turuncu |
| Süresi Geçenler | targetDate < now && !CLOSED | Kırmızı |
| Kapatma Bekleyenler | PENDING_CLOSURE | Mor |
| Bu Ay Kapatılan | Bu ay CLOSED olan | Yeşil |

**Grafikler/Raporlar**:

1. **Durum Dağılımı** (Pie/Donut Chart):
   - Her status'ün sayısı ve yüzdesi

2. **Aylık Trend** (Bar/Line Chart):
   - Son 12 ay: açılan vs kapatılan DFİ sayısı

3. **Departman Bazlı** (Horizontal Bar Chart):
   - Her departmanın açtığı ve sorumlu olduğu DFİ sayısı

4. **Bildirim Kaynağı Dağılımı** (Pie Chart):
   - İç Tetkik, Müşteri Şikayeti, İç Uygunsuzluk vb.

5. **Ortalama Kapanış Süresi** (KPI Card + Trend):
   - Genel ortalama gün sayısı
   - Departman bazlı ortalama
   - Son 6 aylık trend

6. **Süresi Geçen DFİ Listesi** (Tablo):
   - DF No, Tarih, Sorumlu, Hedef Tarihi, Gecikme Gün Sayısı

7. **Top Açan Birimler** (Ranked list):
   - En çok DFİ açan departmanlar

8. **Kaynak Bazlı Ortalama Kapanış Süresi** (Table):
   - Her bildirim kaynağı için ortalama çözüm süresi

### 5.2 Görevlerim Sayfası

**Route**: `/car/my-tasks`

Oturum açan kullanıcının:
- Sorumlu olduğu açık DFİ'ler
- Atanmış düzeltici faaliyetler
- Kapatma onayı bekleyen DFİ'ler (CLOSE_CAR permission varsa)

### 5.3 Kullanıcı Detay Sayfası Güncellemesi

**Route**: `/users/[id]` (mevcut sayfa, tabs eklenir)

**Tab Yapısı**:
- **Genel Bilgi** (mevcut içerik)
- **DMS İstatistikleri** (mevcut stats cards + activity)
- **Düzeltici Faaliyet İstatistikleri** (YENİ)

**DF Tab İçeriği**:
- **İstatistik Kartları**:
  - Açtığı DFİ sayısı
  - Sorumlu olduğu DFİ sayısı
  - Tamamlanan Faaliyetler
  - Ortalama Kapanış Süresi
- **Son DFİ'ler Tablosu**: Kullanıcının ilgili olduğu son 10 DFİ
- **Faaliyet Geçmişi**: Kullanıcının CAR modülündeki son aksiyonları

### 5.4 Departman Detay Sayfası Güncellemesi

**Route**: `/departments/[id]` (mevcut sayfa, tabs eklenir)

**Tab Yapısı**:
- **Genel Bilgi** (mevcut içerik - üyeler listesi)
- **DMS İstatistikleri** (YENİ)
- **Düzeltici Faaliyet İstatistikleri** (YENİ)

**DF Tab İçeriği**:
- **İstatistik Kartları**:
  - Bu departmandan açılan DFİ sayısı
  - Bu departmana atanan DFİ sayısı
  - Açık DFİ sayısı
  - Süresi geçen DFİ sayısı
  - Ortalama Kapanış Süresi
- **Bildirim Kaynağı Dağılımı** (mini pie chart)
- **Son DFİ'ler Tablosu**: Departmanla ilgili son 10 DFİ

---

## Faz 6: PDF Oluşturma

### 6.1 PDF Şablonu

**Kütüphane**: @react-pdf/renderer veya jsPDF

**Header**:
```
[GÜRAL Logo]    DÜZELTİCİ FAALİYET FORMU
                3300.FR.009.1-{revisionDate}
```

**İçerik Bölümleri**:
1. DFİ Bilgileri (Excel formdaki gibi satırlar)
2. Uygunsuzluk Tanımı
3. Kök Neden Analizi
4. Acil Aksiyon
5. Planlanan Düzeltici Faaliyet(ler)
6. Düzeltici Faaliyet Sonuçları
7. Kapanış Bilgileri
8. Onay (Kalite Güvence - Ad, Soyad, Tarih)
9. Ekler listesi

**Footer**:
```
{indirme tarihi}    Sayfa {n}/{total}
```

### 6.2 PDF API Route

**Route**: `/api/car/[id]/pdf`
- Auth check
- CAR verilerini çek
- PDF oluştur ve stream et

---

## Faz 7: Entegrasyon & Son Rötuşlar

### 7.1 DMS Form Referansı

- CAR ayarlarında "DMS Form Şablonu" dropdown'u
- Mevcut DMS dokümanlarından seçim
- PDF oluşturulurken header'da bu dokümanın kodu ve revizyon tarihi

### 7.2 i18n

Tüm yeni string'ler:
- `src/i18n/messages/en.json` -> `car.*` namespace
- `src/i18n/messages/tr.json` -> `car.*` namespace

Anahtar gruplar:
- `car.common` - Ortak terimler
- `car.form` - Form alanları
- `car.status` - Durum isimleri
- `car.actions` - Aksiyon butonları
- `car.dashboard` - Kontrol paneli
- `car.notifications` - Bildirim metinleri
- `car.settings` - Ayarlar
- `car.reports` - Raporlar

### 7.3 Responsive Design

- Tüm sayfalar mobil uyumlu
- Form: tek sütun (mobil), 2 sütun (tablet), 3 sütun (desktop)
- Tablo: horizontal scroll (mobil)
- Dashboard: kartlar responsive grid

### 7.4 Güvenlik

- Tüm server action'larda session check
- Role/permission bazlı erişim kontrolü
- File upload validasyonu (boyut, tip)
- XSS koruması (user input sanitization)
- Rate limiting (form submit)

---

## Dosya Yapısı (Yeni/Değişen Dosyalar)

```
src/
├── lib/db/schema/
│   ├── car-lookups.ts (YENİ)
│   ├── corrective-action-requests.ts (YENİ)
│   ├── car-root-cause.ts (YENİ)
│   ├── car-immediate-actions.ts (YENİ)
│   ├── car-corrective-actions.ts (YENİ)
│   ├── car-action-team.ts (YENİ)
│   ├── car-attachments.ts (YENİ)
│   ├── car-notification-users.ts (YENİ)
│   ├── car-activity-logs.ts (YENİ)
│   ├── user-permissions.ts (YENİ)
│   └── index.ts (GÜNCELLE - yeni schema'ları export et)
│
├── actions/
│   ├── car.ts (YENİ)
│   ├── car-root-cause.ts (YENİ)
│   ├── car-immediate-action.ts (YENİ)
│   ├── car-corrective-actions.ts (YENİ)
│   ├── car-attachments.ts (YENİ)
│   ├── car-dashboard.ts (YENİ)
│   ├── car-settings.ts (YENİ)
│   ├── user-permissions.ts (YENİ)
│   ├── users.ts (GÜNCELLE - permission yönetimi)
│   └── dashboard.ts (GÜNCELLE - genel dashboard'a CAR özetleri)
│
├── app/(dashboard)/
│   ├── car/
│   │   ├── page.tsx (DFİ Listesi)
│   │   ├── create/page.tsx (DFİ Oluştur)
│   │   ├── [id]/page.tsx (DFİ Detay)
│   │   ├── dashboard/page.tsx (CAR Kontrol Paneli)
│   │   └── my-tasks/page.tsx (Görevlerim)
│   ├── users/[id]/page.tsx (GÜNCELLE - tabs ekle)
│   ├── departments/[id]/page.tsx (GÜNCELLE - tabs ekle)
│   └── settings/page.tsx (GÜNCELLE - CAR tab ekle)
│
├── components/
│   ├── car/
│   │   ├── car-form.tsx (Oluşturma/düzenleme formu)
│   │   ├── car-list.tsx (TanStack Table listesi)
│   │   ├── car-detail-view.tsx (Detay görünümü)
│   │   ├── car-status-badge.tsx (Durum badge)
│   │   ├── car-workflow-stepper.tsx (Workflow adımları gösterge)
│   │   ├── car-root-cause-section.tsx (Kök neden bölümü)
│   │   ├── car-immediate-action-section.tsx (Acil aksiyon bölümü)
│   │   ├── car-corrective-actions-table.tsx (Faaliyetler tablosu)
│   │   ├── car-corrective-action-dialog.tsx (Faaliyet ekleme/düzenleme)
│   │   ├── car-closure-section.tsx (Kapatma bölümü)
│   │   ├── car-activity-timeline.tsx (Aktivite geçmişi)
│   │   ├── car-attachment-section.tsx (Ekler bölümü)
│   │   ├── car-dashboard-stats.tsx (Dashboard istatistik kartları)
│   │   ├── car-dashboard-charts.tsx (Dashboard grafikleri)
│   │   ├── car-my-tasks-view.tsx (Görevlerim görünümü)
│   │   ├── car-user-stats.tsx (Kullanıcı detay CAR tab)
│   │   └── car-department-stats.tsx (Departman detay CAR tab)
│   ├── settings/
│   │   └── car-settings-tab.tsx (YENİ - Ayarlar CAR tab)
│   ├── users/
│   │   └── user-detail-view.tsx (GÜNCELLE - tabs)
│   ├── departments/
│   │   └── department-detail-view.tsx (GÜNCELLE - tabs)
│   └── layout/
│       └── sidebar.tsx (GÜNCELLE - CAR navigasyonu)
│
├── lib/
│   ├── email/templates/
│   │   ├── car-created.tsx (YENİ)
│   │   ├── car-status-changed.tsx (YENİ)
│   │   ├── car-action-assigned.tsx (YENİ)
│   │   ├── car-closure-requested.tsx (YENİ)
│   │   ├── car-closed.tsx (YENİ)
│   │   ├── car-rejected.tsx (YENİ)
│   │   ├── car-reminder.tsx (YENİ)
│   │   └── car-overdue.tsx (YENİ)
│   ├── queue/
│   │   └── index.ts (GÜNCELLE - CAR job türleri ekle)
│   └── redis/
│       └── pubsub.ts (GÜNCELLE - CAR kanalları ekle)
│
├── app/api/
│   └── car/[id]/pdf/route.ts (YENİ - PDF oluşturma)
│
├── i18n/messages/
│   ├── en.json (GÜNCELLE - car.* namespace)
│   └── tr.json (GÜNCELLE - car.* namespace)
│
└── worker.ts (GÜNCELLE - CAR job'ları ekle)
```

## Uygulama Sırası

| Faz | Açıklama | Tahmini Dosya Sayısı |
|-----|----------|---------------------|
| **Faz 1** | DB Schema + Lookup + Permissions + Settings Tab | ~15 dosya |
| **Faz 2** | Sidebar + Create + List + Detail (temel) | ~15 dosya |
| **Faz 3** | Workflow + Server Actions + Düzeltici Faaliyetler | ~12 dosya |
| **Faz 4** | Bildirimler + Email + Hatırlatıcılar | ~12 dosya |
| **Faz 5** | Dashboard + Raporlar + User/Dept tabs | ~10 dosya |
| **Faz 6** | PDF Oluşturma | ~3 dosya |
| **Faz 7** | i18n + Responsive + Security + DMS link | ~8 dosya |

**Toplam**: ~75 yeni/güncellenen dosya
