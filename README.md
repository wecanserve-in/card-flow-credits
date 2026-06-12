# CardFlow

Transform business cards into organized contact data in seconds.

CardFlow is an AI-powered business card scanner that extracts contact information from visiting cards and automatically converts it into structured digital records. Users can upload one or multiple business cards, review extracted details, and export contacts directly to Excel.

**Live Demo:** https://cardflow.wecanserve.in/

---

## Overview

Managing business cards manually is time-consuming and error-prone. CardFlow eliminates manual data entry by leveraging Google's multimodal AI capabilities to instantly capture and structure contact information from business card images.

The system extracts:

* Full Name
* Company Name
* Designation
* Phone Number
* Email Address
* Website
* Country
* Address

The extracted information is displayed in a clean interface and automatically saved to an Excel file for future use.

---

## Key Features

### AI-Powered Business Card Recognition

Upload business card images and let Gemini Vision analyze the card content directly from the image.

### Intelligent Contact Extraction

Convert unstructured card data into organized contact records with AI-assisted parsing.

### Multi-Card Processing

Process multiple business cards in a single upload session.

### Automatic Excel Export

All extracted contacts are automatically stored and exported into a centralized Excel spreadsheet.

### Smart Contact Detection

Automatically identifies:

* Names
* Companies
* Designations
* Phone Numbers
* Email Addresses
* Websites
* Countries
* Addresses

### Modern User Experience

* Responsive interface
* Drag-and-drop uploads
* Loading indicators
* Downloadable Excel records
* Mobile-friendly design

---

## How It Works

### Step 1

Upload one or more business card images.

### Step 2

Gemini Vision analyzes the card image and extracts visible text and layout information.

### Step 3

AI processes the extracted content and identifies structured contact details.

### Step 4

Results are displayed in a clean, organized format for review.

### Step 5

Contacts are automatically saved and exported to Excel.

---

## Supported Formats

* PNG
* JPG
* JPEG

For best results:

* Upload clear images
* Keep cards properly aligned
* Avoid blurry or low-resolution photos
* Ensure text is clearly visible

---

## Exported Data Structure

| Field       | Description                  |
| ----------- | ---------------------------- |
| Name        | Contact name                 |
| Company     | Organization name            |
| Designation | Job title                    |
| Phone       | Contact number               |
| Country     | Country identified from card |
| Email       | Email address                |
| Website     | Company or personal website  |
| Address     | Business address             |

---

## Technology Stack

### Frontend

* React
* Vite
* Modern CSS

### Backend

* FastAPI
* Python

### AI Vision & Extraction

* Google Gemini Vision
* Gemini Multimodal Models

### Data Processing

* Pandas
* Regular Expressions
* PyCountry

### Data Export

* OpenPyXL
* Pandas

---

## Use Cases

### Sales Teams

Digitize visiting cards collected during meetings, exhibitions, and client visits.

### Business Development

Build and maintain a structured contact database without manual entry.

### Events & Conferences

Capture hundreds of leads and organize them instantly.

### Recruiters

Store candidate and professional contact information efficiently.

### Startups & SMEs

Create a centralized repository of business contacts from physical cards.

---

## Security & Privacy

Uploaded images are processed solely for contact information extraction. Users retain full ownership and control of their extracted data and exported Excel files.

---

## Roadmap

Future enhancements include:

* Google Sheets Integration
* CRM Integration
* Advanced Duplicate Detection
* Contact Search & Filtering
* PDF Business Card Support
* Contact Management Dashboard
* QR Code Detection
* Lead Categorization
* CSV Export
* API Access

---

## Product Name

**CardFlow**

*Extract. Organize. Export.*
