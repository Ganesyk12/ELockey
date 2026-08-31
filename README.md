# ELockey

🇮🇩 Bahasa Indonesia · [🇬🇧 English](./README.en.md)

Rumah aman untuk semua akun & password. Setiap data vault terenkripsi end-to-end, sehingga hanya pemilik master key yang bisa membukanya. Server tidak pernah menyimpan atau membaca isi vault.

![elockey flow](./docs/flow-animation.svg)

## Cara kerjanya

1. **Akun dibuat dengan master key**
   Master key adalah satu-satunya kunci milik pengguna. Ia **tidak pernah disimpan** — database hanya menyimpan hash-nya, jadi tidak ada yang bisa meniru atau mencurinya.

2. **Data akun tersimpan di vault**
   Username, password, atau catatan apa pun langsung dienkripsi di proses. Server tidak pernah melihat data asli.

3. **Data dienkripsi sebelum tersimpan**
   Setiap data dienkripsi dengan **AES-256-GCM**; kunci diturunkan dari master key (scrypt) dengan salt & IV acak per entry.

4. **Yang tersimpan hanya ciphertext**
   Database hanya menyimpan `salt.iv.tag.data` (teks terenkripsi). Zero plaintext — walau database bocor, isinya tetap tidak terbaca.

> **No one knows, selain pemiliknya.**

[**&#9654; Try now**](https://elockey.votagers.or.id/)