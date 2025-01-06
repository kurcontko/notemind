param location string = resourceGroup().location
param webAppName string
param containerRegistryName string
param cosmosName string
param keyVaultName string
param openAiAccountName string
param searchServiceName string
param cogServicesName string

@description('Document Intelligence resource name')
param docIntelligenceName string

@description('Azure Language resource name')
param languageResourceName string

// App Service Plan
resource appServicePlan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: '${webAppName}-plan'
  location: location
  sku: {
    name: 'B1'
    tier: 'Basic'
  }
}

// Web App
resource webApp 'Microsoft.Web/sites@2022-09-01' = {
  name: webAppName
  location: location
  properties: {
    serverFarmId: appServicePlan.id
  }
}

// Container Registry (optional)
resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-01-01-preview' = if (containerRegistryName != '') {
  name: containerRegistryName
  location: location
  sku: {
    name: 'Basic'
  }
}

// Key Vault
resource keyVault 'Microsoft.KeyVault/vaults@2022-07-01' = {
  name: keyVaultName
  location: location
  properties: {
    tenantId: tenantId
    sku: {
      name: 'standard'
      family: 'A'
    }
    accessPolicies: []
    enabledForDeployment: true
  }
}

// Storage Account
resource storageAccount 'Microsoft.Storage/storageAccounts@2022-09-01' = {
  name: '${uniqueString(resourceGroup().id)}storage'
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
}

resource mediaContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2022-09-01' = {
  name: '${storageAccount.name}/media'
  properties: {
    publicAccess: 'Blob'
  }
}

// Azure Cognitive Services for OpenAI (Document Intelligence & OpenAI)
resource cognServices 'Microsoft.CognitiveServices/accounts@2022-12-01' = {
  name: cogServicesName
  location: location
  kind: 'OpenAI'
  sku: {
    name: 'S0'
  }
  properties: {
    apiProperties: {
      openai: { publicNetworkAccess: 'Enabled' }
    }
  }
}

resource docIntelligence 'Microsoft.CognitiveServices/accounts@2022-12-01' = {
  name: docIntelligenceName
  location: location
  kind: 'FormRecognizer'
  sku: {
    name: 'F0'
  }
  properties: {
    publicNetworkAccess: 'Enabled'
  }
}

resource languageResource 'Microsoft.CognitiveServices/accounts@2022-12-01' = {
  name: languageResourceName
  location: location
  kind: 'Language'
  sku: {
    name: 'F0'
  }
  properties: {
    publicNetworkAccess: 'Enabled'
  }
}

@description('Deploy text-embeddings-3-small model')
resource embeddingsDeployment 'Microsoft.CognitiveServices/accounts/deployments@2023-05-01' = {
  name: 'text-embeddings-3-small'
  parent: cognServices
  properties: {
    model: {
      format: 'OpenAI'
      name: 'text-embeddings-3-small'
      version: '1'
    }
    scaleSettings: {
      capacity: 1
    }
  }
}

@description('Deploy gpt-4o-mini model')
resource gpt4oMiniDeployment 'Microsoft.CognitiveServices/accounts/deployments@2023-05-01' = {
  name: 'gpt-4o-mini'
  parent: cognServices
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-4o-mini'
      version: '1'
    }
    scaleSettings: {
      capacity: 1
    }
  }
}

@description('Deploy whisper model')
resource whisperDeployment 'Microsoft.CognitiveServices/accounts/deployments@2023-05-01' = {
  name: 'whisper'
  parent: cognServices
  properties: {
    model: {
      format: 'OpenAI'
      name: 'whisper'
      version: '1'
    }
    scaleSettings: {
      capacity: 1
    }
  }
}

// Azure Search (optional)
resource searchService 'Microsoft.Search/searchServices@2020-08-01' = if (searchServiceName != '') {
  name: searchServiceName
  location: location
  sku: {
    name: 'standard'
  }
}

// Cosmos DB (NoSQL)
resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2022-11-15' = if (cosmosName != '') {
  name: cosmosName
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    createMode: 'Default'
    databaseAccountOfferType: 'Standard'
  }
}

