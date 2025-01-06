# Notemind

Notemind is a multimodal note-taking application that leverages Azure services for enhanced functionality. It integrates audio transcription, document intelligence, image processing, and advanced search capabilities, making it a great tool for managing and enhancing your notes.

## Features

- **Audio Transcription**: Convert audio files to text using Azure OpenAI's Whisper model.
- **Document Intelligence**: Extract markdown content from documents using Azure Document Intelligence.
- **Image OCR and Description**: Unlock the value of images by extracting text and generating detailed descriptions using Azure Vision services.
- **Note Management**: Create, update, and delete notes using markdown syntax including text, files, and metadata.
- **Audio Recording**: Record and save notes directly within the application for quick and efficient documentation.
- **Search**: Utilize Azure AI Search or CosmosDB with vector embeddings for powerful, context-aware searches. Leverage hybrid search to discover entities, tags, and related content effortlessly.
- **Media Storage**: Store and manage media files using Azure Blob Storage.
- **AI-Powered Metadata Generation**: Automatically generate insightful metadata like titles and tags for your notes using LLMs, ensuring your content is always categorized and easy to retrieve.
- **Interactive Chatbot**: Engage with an AI chatbot powered by Azure, with access to your note data. Ask questions, retrieve specific information, or gain insights from your notes in a conversational and user-friendly manner.

## Setup

### Prerequisites

- Node.js
- Python 3.10+
- Docker (optional, for containerized deployment)
- Azure account with necessary services provisioned

### Backend

1. Navigate to the `backend` directory:
```sh
cd backend
```

2. Install dependencies
```sh
pip install -r requirements.txt
```

3. Set up environment variables. Create a `.env` file in the `backend` directory and add the necessary configuration values.

4. Run the backend server
```sh
uvicorn main:app --reload
```

### Frontend

1. Navigate to the `frontend` directory:
```sh
cd frontend
```

2. Install dependencies
```sh
npm install
```

3. Set up environment variables. Create a `.env` file in the `frontend` directory and add the necessary configuration values.

4. Run the frontend development server
```sh
npm start
```

### Azure Deployment

To deploy the necessary Azure resources using the provided Bicep file, follow these steps:

1. Install the Azure CLI and Bicep CLI:
   - [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
   - [Bicep CLI](https://docs.microsoft.com/en-us/azure/azure-resource-manager/bicep/install)

2. Log in to your Azure account:
```sh
az login
```

3. Navigate to the `infrastructure` directory:
```sh
cd infrastructure
```

4. Deploy the Bicep file:
```sh
az deployment group create --resource-group <your-resource-group> --template-file main.bicep
```

### Environment Variables

Create a `.env` file in both the `backend` and `frontend` directories and add the necessary configuration values. Below are the required environment variables:

#### Backend

Copy `.env.sample` and configure

#### Frontend

- `VITE_API_URL`: The URL of your backend API

