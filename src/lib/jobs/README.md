# DMS Cron Jobs

Bu klasör, DMS sisteminin arka plan görevlerini (cron jobs) içerir.

## Görevler

### 1. Approval Reminder (`approval-reminder.ts`)
- **Amaç**: Bekleyen onaylar için hatırlatma e-postaları gönderir
- **Çalışma Mantığı**:
  - `DEFAULT_REMINDER_DAYS` (varsayılan: 3 gün) süresinden daha eski PENDING onayları bulur
  - Daha önce hatırlatma gönderilmemişse veya son hatırlatma 1+ gün önceyse e-posta gönderir
  - Her hatırlatma için notification oluşturur
  - `reminderSentAt` alanını günceller

### 2. Approval Escalation (`approval-escalation.ts`)
- **Amaç**: Uzun süre bekleyen onayları yönetime eskale eder
- **Çalışma Mantığı**:
  - `DEFAULT_ESCALATION_DAYS` (varsayılan: 7 gün) süresinden daha eski PENDING onayları bulur
  - Daha önce eskale edilmemişse (`escalatedAt` null) işlem yapar
  - Department manager veya ADMIN kullanıcısına eskale eder
  - Escalation notification oluşturur
  - `escalatedAt` alanını günceller

### 3. Read Reminder (`read-reminder.ts`)
- **Amaç**: Okunmamış belge atamaları için hatırlatma gönderir
- **Çalışma Mantığı**:
  - `read_reminder_days` (varsayılan: 3 gün) süresinden daha eski onaylanmamış read confirmation'ları bulur
  - Daha önce hatırlatma gönderilmemişse veya son hatırlatma 1+ gün önceyse e-posta gönderir
  - Her hatırlatma için notification oluşturur
  - `reminderSentAt` alanını günceller

## Cron API Endpoint

### Endpoint: `GET /api/cron`

**Authentication**: Bearer token gerektirir
```bash
Authorization: Bearer {CRON_SECRET}
```

**Kullanım**:
```bash
curl -X GET 'http://localhost:3000/api/cron' \
  -H 'Authorization: Bearer dev-cron-secret-change-in-production'
```

**Response**:
```json
{
  "success": true,
  "timestamp": "2026-02-14T16:52:49.420Z",
  "results": {
    "duration": "46ms",
    "approvalReminders": {
      "processed": 0,
      "sent": 0,
      "errors": 0
    },
    "approvalEscalations": {
      "processed": 0,
      "escalated": 0,
      "errors": 0
    },
    "readReminders": {
      "processed": 0,
      "sent": 0,
      "errors": 0
    }
  }
}
```

## Production Setup

### 1. Environment Variables

`.env.production` dosyasına ekleyin:
```bash
CRON_SECRET=your-secure-random-secret-here
DEFAULT_REMINDER_DAYS=3
DEFAULT_ESCALATION_DAYS=7
```

### 2. Cron Scheduler Kurulumu

#### Vercel Cron (Önerilen - Vercel'de host ediliyorsa)

`vercel.json` oluşturun:
```json
{
  "crons": [{
    "path": "/api/cron",
    "schedule": "0 9 * * *"
  }]
}
```

**Not**: Vercel Cron otomatik olarak authentication ekler, `CRON_SECRET` kontrolünü pas geçebilirsiniz.

#### GitHub Actions

`.github/workflows/cron.yml` oluşturun:
```yaml
name: Run DMS Cron Jobs
on:
  schedule:
    - cron: '0 9 * * *'  # Her gün saat 09:00 UTC
  workflow_dispatch:  # Manuel tetikleme için

jobs:
  cron:
    runs-on: ubuntu-latest
    steps:
      - name: Call Cron Endpoint
        run: |
          curl -X GET '${{ secrets.APP_URL }}/api/cron' \
            -H 'Authorization: Bearer ${{ secrets.CRON_SECRET }}'
```

Repository secrets ekleyin:
- `APP_URL`: Production URL (örn: https://dms.example.com)
- `CRON_SECRET`: `.env.production` ile aynı secret

#### EasyCron / Cron-Job.org (Üçüncü Parti)

1. [EasyCron](https://www.easycron.com) veya [Cron-Job.org](https://cron-job.org) hesabı oluşturun
2. Yeni cron job ekleyin:
   - **URL**: `https://your-domain.com/api/cron`
   - **Method**: GET
   - **Schedule**: `0 9 * * *` (her gün saat 09:00)
   - **Headers**:
     ```
     Authorization: Bearer your-cron-secret
     ```

#### Linux Cron

```bash
# crontab -e
0 9 * * * curl -X GET 'https://your-domain.com/api/cron' -H 'Authorization: Bearer your-cron-secret'
```

## Test

Development ortamında test etmek için:

```bash
# Local dev server başlatın
npm run dev

# Cron endpoint'ini çağırın
curl -X GET 'http://localhost:3000/api/cron' \
  -H 'Authorization: Bearer dev-cron-secret-change-in-production'
```

## Monitoring

Logları kontrol edin:
- Development: Terminal console
- Production: Hosting provider logs (Vercel logs, Railway logs, vb.)

Her job çalıştırıldığında şu bilgileri loglar:
- İşlenen kayıt sayısı
- Gönderilen e-posta sayısı
- Hata sayısı
- İşlem süresi

## Troubleshooting

### "Unauthorized" hatası
- `CRON_SECRET` environment variable'ının doğru set edildiğinden emin olun
- Authorization header'ın doğru formatta olduğunu kontrol edin

### E-postalar gönderilmiyor
- Email provider ayarlarını kontrol edin (Resend API key veya SMTP ayarları)
- `system_settings` tablosunda email ayarlarının doğru olduğundan emin olun

### Job çalışmıyor
- Database bağlantısının aktif olduğundan emin olun
- İlgili tablolarda veri olup olmadığını kontrol edin
- Console loglarını inceleyin

## İlgili Dosyalar

- **Schema**:
  - `src/lib/db/schema/approvals.ts` - `reminderSentAt`, `escalatedAt` alanları
  - `src/lib/db/schema/read-confirmations.ts` - `reminderSentAt` alanı
- **Email Templates**:
  - `src/lib/email/templates/approval-reminder.tsx`
  - `src/lib/email/templates/escalation-notice.tsx`
  - `src/lib/email/templates/read-reminder.tsx`
- **API Route**: `src/app/api/cron/route.ts`
