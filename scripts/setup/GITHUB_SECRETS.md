# GitHub Secrets Configuration for CLIMB (Service Account Mode)

Untuk menjalankan pipeline CI/CD menggunakan Service Account, harap tambahkan "Repository Secrets" berikut di GitHub:

## Secret Utama
- `GCP_SA_KEY`: Isi dengan **JSON Key** dari Service Account yang memiliki akses ke Compute Engine.

---

### Langkah Penyiapan di GCP:

1. **Buat Service Account:**
   - Masuk ke GCP Console > IAM & Admin > Service Accounts.
   - Buat SA baru (misal: `climb-deployer`).
   
2. **Berikan Roles (Izin):**
   - `roles/compute.instanceAdmin.v1`: Untuk mengelola instance.
   - `roles/compute.osLogin`: Untuk akses masuk via SSH.
   - `roles/iam.serviceAccountUser`: Dibutuhkan untuk menjalankan aksi sebagai SA.
   - `roles/bigquery.admin`: (Opsional jika ingin otomatisasi schema BQ).

3. **Generate JSON Key:**
   - Klik SA yang baru dibuat > Keys > Add Key > Create new key > JSON.
   - Simpan file tersebut dan masukkan isinya ke GitHub Secret `GCP_SA_KEY`.

4. **Aktifkan OS Login di VM (Penting):**

   - Pastikan metadata `enable-oslogin=TRUE` sudah diset pada project atau instance agar `gcloud compute ssh` bekerja dengan lancar.



---



### Target Instance:

Pastikan VM Anda di GCP diberi nama sebagai berikut agar pipeline CI/CD mengenali targetnya:

- **climb-prod** (Target untuk branch `main`)

- **climb-dev-1** (Target untuk branch `dev-1`)

- **climb-dev-2** (Target untuk branch `dev-2`)
