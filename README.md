# web3-todo-tasks

Website: https://todotasks.xyz/

TodoTasks.xyz is a web3 end-to-end encrypted task manager.

Encryption key is derived from wallet signature using Argon2 and HKDF, and it is stored on the client side. Tasks are encrypted with AES using the encryption key. The approach is similar to the one in the [Skiff Privacy whitepaper](https://skiff-org.github.io/whitepaper/Skiff_Whitepaper_2022.pdf).
