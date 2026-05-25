provider "google" {
  project = "gfw-int-infrastructure"
}


module "develop" {
  source                = "../cloudbuild-template"
  repository            = "gfw-mcp-js"
  project_id            = "gfw-development"
  docker_image          = "us-central1-docker.pkg.dev/gfw-int-infrastructure/api/gfw-mcp-js:latest-dev"
  api_name              = "gfw-mcp-js"
  short_environment     = "dev"
  service_account       = "api-gfw-mcp-js-dev@gfw-development.iam.gserviceaccount.com"
  allow_unauthenticated = true
  memory                = "512Mi"
  cpu                   = 1
  push_config = {
    branch       = "develop"
    invert_regex = false
  }
  labels = {
    environment      = "develop"
    resource_creator = "engineering"
    project          = "api"
  }
  set_env_vars = [
    "NODE_ENV=development",
    "SENTRY_ENVIRONMENT=development",
  ]
  set_secrets = [
    "SENTRY_DSN=projects/706952489382/secrets/API_SENTRY_DSN",
  ]
}


module "staging" {
  source                = "../cloudbuild-template"
  repository            = "gfw-mcp-js"
  project_id            = "gfw-development"
  docker_image          = "us-central1-docker.pkg.dev/gfw-int-infrastructure/api/gfw-mcp-js:latest-sta"
  api_name              = "gfw-mcp-js"
  short_environment     = "sta"
  service_account       = "api-gfw-mcp-js-sta@gfw-development.iam.gserviceaccount.com"
  allow_unauthenticated = true
  memory                = "512Mi"
  cpu                   = 1
  push_config = {
    branch       = "main"
    invert_regex = false
  }
  labels = {
    environment      = "staging"
    resource_creator = "engineering"
    project          = "api"
  }
  set_env_vars = [
    "NODE_ENV=development",
    "SENTRY_ENVIRONMENT=staging",
  ]
  set_secrets = [
    "SENTRY_DSN=projects/706952489382/secrets/API_SENTRY_DSN",
  ]
}


module "production" {
  source                = "../cloudbuild-template"
  repository            = "gfw-mcp-js"
  project_id            = "gfw-production"
  docker_image          = "us-central1-docker.pkg.dev/gfw-int-infrastructure/api/gfw-mcp-js:latest-pro"
  api_name              = "gfw-mcp-js"
  short_environment     = "pro"
  service_account       = "api-gfw-mcp-js-pro@gfw-production.iam.gserviceaccount.com"
  allow_unauthenticated = true
  memory                = "512Mi"
  cpu                   = 1
  push_config = {
    tag          = ".*"
    invert_regex = false
  }
  labels = {
    environment      = "production"
    resource_creator = "engineering"
    project          = "api"
  }
  set_env_vars = [
    "NODE_ENV=production",
    "SENTRY_ENVIRONMENT=production",
  ]
  set_secrets = [
    "SENTRY_DSN=projects/674016975526/secrets/API_SENTRY_DSN",
  ]
}
