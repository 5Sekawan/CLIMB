# Guide: SSH Key Setup for CLIMB Deployment

Gunakan panduan ini jika Anda memilih menggunakan metode SSH Key tradisional (Direkomendasikan untuk menghindari masalah IAM lintas-organisasi).

## 1. Generate SSH Key di Lokal

Jalankan perintah ini di komputer Anda:

```bash
# Membuat folder ssh jika belum ada
mkdir -p ~/.ssh

# Generate key (Tanpa passphrase untuk otomatisasi CI/CD)
ssh-keygen -t rsa -b 4096 -f ~/.ssh/climb_deployer -C "deployer"
```

Output:
- `~/.ssh/climb_deployer` (PRIVATE KEY - JANGAN DISEBAR)
- `~/.ssh/climb_deployer.pub` (PUBLIC KEY)

## 2. Daftarkan Public Key ke GCP

1. Buka [GCP Console - Metadata](https://console.cloud.google.com/compute/metadata).
2. Klik tab **SSH Keys**.
3. Klik **Edit** lalu **Add Item**.
4. Paste seluruh isi dari file `climb_deployer.pub`.
   - Formatnya harus: `ssh-rsa [KODE_PANJANG] deployer`
5. Klik **Save**.

## 3. Masukkan Private Key ke GitHub

1. Buka repo GitHub Anda > **Settings** > **Secrets** > **Actions**.
2. Klik **New repository secret**.
3. Name: `SSH_PRIVATE_KEY`.
4. Value: Paste isi file `climb_deployer` (Private Key).
5. Klik **Add secret**.

## 4. Pastikan OS Login Dimatikan (Opsional tapi Disarankan)

Jika OS Login masih aktif, ia mungkin akan menolak SSH key manual.
1. Buka [GCP Console - Metadata](https://console.cloud.google.com/compute/metadata).
2. Klik tab **Metadata**.
3. Pastikan `enable-oslogin` bernilai `FALSE` atau hapus baris tersebut.

## 5. Test Koneksi

Coba masuk ke VM dari terminal Anda menggunakan key tersebut:

```bash
ssh -i ~/.ssh/climb_deployer deployer@[IP_VM_ANDA]
```

Jika berhasil masuk, maka pipeline CI/CD juga akan berhasil.
