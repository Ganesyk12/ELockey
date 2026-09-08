# ELockey

[🇮🇩 Bahasa Indonesia](./README.md) · 🇬🇧 English

A secure home for all your accounts & passwords. Every vault entry is authenticated-encrypted (AES-256-GCM) with a zero-plaintext storage architecture. The database server never stores plaintext credentials or your master key.

![elockey flow](./docs/flow-animation.svg)

## How it works

1. **An account is created with a master key**
   The master key is the only key the owner holds. It is **never stored** — the database only keeps its hash, so nobody can replicate or steal it.

2. **Account data is stored in the vault**
   Username, password, or any notes are encrypted during processing. The server never sees the original data.

3. **Data is encrypted before it is stored**
   Each entry is encrypted with **AES-256-GCM**; the key is derived from the master key (scrypt) with a random salt & IV per entry.

4. **Only ciphertext is stored**
   The database stores only `salt.iv.tag.data` (encrypted text). Zero plaintext — even if the database leaks, its contents stay unreadable.

> **No one knows, but the owner.**

[**&#9654; Try now**](https://elockey.votagers.or.id/)