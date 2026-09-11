# DPP Browser

A React web app for reading and comparing **Digital Product Passports (DPP)** — structured data sheets that describe the environmental and technical properties of a product throughout its lifecycle.

## Features

- **Barcode / QR scanner** — scan a product code directly from the camera
- **Product details** — view the full DPP data sheet for a product
- **Product comparison** — compare two or more products side by side
- **Multi-language support** — language selector built in
- **Authentication** — login via Firebase Auth

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React 18 + Bootstrap 5 |
| Routing | React Router DOM 7 |
| Build | Vite 6 |
| Backend | Firebase (Firestore + Auth) |
| Scanner | html5-qrcode / ZXing |
| Deploy | Vercel |

**Getting Started:**

**Prerequisites:**

* Node.js (version 16 or higher): Download and install it from the official website: https://nodejs.org/

**Installation:**

1. **Clone the repository:**

  ```bash
  git clone REPOSITORY_URL
  cd dpp_web_app
  ```
2. **Install Dependecies:**
  ```bash
	npm install
  ```

**Usage:**
* **Basic usage:** 
1. **Run the development environment:**
  ```bash
	npm run dev
  ```
2. **Access the app:**
	Open your browser and navigate to the address indicated by the command, something like: [http://localhost:5173/](http://localhost:5173/).
