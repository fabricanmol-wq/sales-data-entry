# Sales Data Entry Management System

A fully offline, local PC-based Sales Data Entry Management System built with Spring Boot, SQLite, and Vanilla JavaScript.

## Features

- **Offline Mode**: Runs entirely on localhost. No internet required.
- **Role-Based Access**: 
  - Admin (100% access)
  - Data Entry Manager (Can add/edit own entries)
  - Account Manager (View and export only)
- **Dashboard**: Real-time stats, sales charts, and reminder notifications.
- **Sales Data Entry**: CRUD operations, auto-calculations (Net Amount = Bill - Discount).
- **Advanced Filtering & Search**: Global search, date range, city, salesman, amount filters.
- **Excel Export**: Export filtered data to Excel (.xlsx) with one click.
- **Reminder System**: Automatically calculates reminder date (+60 days) and notifies on Dashboard.
- **Backup & Restore**: Admins can easily download and restore SQLite database backups.
- **Keyboard Shortcuts**: `Ctrl+S` to Save, `Ctrl+F` to Search, `Ctrl+E` to Export.

## Tech Stack

- **Backend**: Java 21, Spring Boot 3, Spring Data JPA, Spring Security
- **Database**: SQLite (Embedded, no installation required)
- **Frontend**: HTML5, CSS3, Vanilla JavaScript, Bootstrap 5, Chart.js

## Installation & Running

1. Ensure you have **Java 21** and **Maven** installed on your PC.
2. Open a terminal in this directory.
3. Build the project:
   ```bash
   mvn clean package
   ```
4. Run the application:
   ```bash
   java -jar target/sales-data-entry-0.0.1-SNAPSHOT.jar
   ```
5. Open your browser and navigate to: [http://localhost:8080](http://localhost:8080)

## Default Admin Accounts

Upon first run, the database is automatically seeded with:

- **Username**: `Anmol0001` | **Password**: `Anmol0001`
- **Username**: `Salish0001` | **Password**: `Salish0001`
