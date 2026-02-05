# GitHub Secrets Configuration for CLIMB (SSH Key Mode)

Untuk menjalankan pipeline CI/CD menggunakan SSH Key tradisional, tambahkan "Repository Secrets" berikut:

## Secret Utama
- `GCP_SA_KEY`: Isi dengan **JSON Key** Service Account (Digunakan oleh `google-github-actions/auth`).
- `SSH_PRIVATE_KEY`: Isi dengan **Private Key** yang digenerate (file `climb_deployer`).
- `VM_IP_PROD`: IP Publik VM `climb-prod`.
- `VM_IP_DEV_1`: IP Publik VM `climb-dev-1`.
- `VM_IP_DEV_2`: IP Publik VM `climb-dev-2`.

---

### Langkah Penyiapan:

1. **Generate SSH Key:** Ikuti panduan di `scripts/setup/SSH_SETUP_GUIDE.md`.
2. **Tambah SSH Key ke GCP:** Masukkan Public Key ke Metadata Proyek di GCP.
3. **Matikan OS Login:** Pastikan `enable-oslogin=FALSE` di Metadata GCP agar SSH key manual diterima.
4. **Setup Permissions:** Pastikan Service Account memiliki role `BigQuery Admin` dan `Vertex AI User` untuk runtime aplikasi.




---



### Target Instance:

Pastikan VM Anda di GCP diberi nama sebagai berikut agar pipeline CI/CD mengenali targetnya:

- **climb-prod** (Target untuk branch `main`)

- **climb-dev-1** (Target untuk branch `dev-1`)

- **climb-dev-2** (Target untuk branch `dev-2`)
