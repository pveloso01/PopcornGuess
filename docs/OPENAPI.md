# OpenAPI Documentation

## Overview

PopcornGuess API uses OpenAPI 3.0 specification with interactive documentation powered by drf-spectacular.

## Documentation URLs

### Swagger UI (Interactive)

**URL**: <http://localhost:8000/api/docs/>

Features:

- Interactive API testing
- Try out endpoints directly from the browser
- Authentication testing
- Request/response examples
- Schema validation

### ReDoc (Beautiful Documentation)

**URL**: <http://localhost:8000/api/redoc/>

Features:

- Clean, readable documentation
- Searchable
- Responsive design
- Code samples in multiple languages
- Downloadable OpenAPI schema

### OpenAPI Schema (Raw)

**URL**: <http://localhost:8000/api/schema/>

Formats:

- JSON: <http://localhost:8000/api/schema/?format=json>
- YAML: <http://localhost:8000/api/schema/?format=yaml>

## Using the Documentation

### 1. Browse Available Endpoints

Navigate to Swagger UI or ReDoc to see all available endpoints organized by tags:

- **users**: User management and authentication
- **quizzes**: Quiz gameplay and content (coming soon)
- **analytics**: Statistics and leaderboards (coming soon)

### 2. Test Endpoints

In Swagger UI:

1. Click on an endpoint to expand it
2. Click "Try it out"
3. Fill in required parameters
4. Click "Execute"
5. View the response

### 3. Authentication

For authenticated endpoints:

1. Login to the application
2. Your session cookie will be automatically included
3. Or use the "Authorize" button in Swagger UI

## API Versioning

The API uses URL path versioning:

- Current version: `/api/v1/`
- Future versions: `/api/v2/`, `/api/v3/`, etc.

Version prefix is automatically detected and trimmed in the OpenAPI schema.

## Client Generation

You can generate API clients for your preferred language:

### TypeScript/JavaScript

```bash
# Install generator
npm install @openapitools/openapi-generator-cli -g

# Generate client
openapi-generator-cli generate \
  -i http://localhost:8000/api/schema/?format=yaml \
  -g typescript-axios \
  -o ./frontend/src/api/generated
```

### Python

```bash
pip install openapi-generator-cli

openapi-generator-cli generate \
  -i http://localhost:8000/api/schema/?format=yaml \
  -g python \
  -o ./python-client
```

### Other Languages

Supported: Java, Go, Ruby, PHP, Swift, Kotlin, C#, and 50+ more.

See: <https://openapi-generator.tech/docs/generators>

## Schema Customization

### Adding Endpoint Documentation

Use `@extend_schema` decorator on views:

```python
from drf_spectacular.utils import extend_schema, OpenApiResponse

@extend_schema(
    summary="Short description",
    description="Detailed description with examples",
    tags=["your-tag"],
    responses={
        200: YourSerializer,
        400: OpenApiResponse(description="Error description"),
    },
)
def your_view(request):
    pass
```

### Adding Serializer Documentation

Add help text and descriptions:

```python
class YourSerializer(serializers.ModelSerializer):
    field = serializers.CharField(
        help_text="Field description",
        required=True,
    )

    class Meta:
        model = YourModel
        fields = ["field"]
        extra_kwargs = {
            "field": {
                "help_text": "Additional field info",
            },
        }
```

### Adding Tags

Update `SPECTACULAR_SETTINGS` in settings.py:

```python
"TAGS": [
    {"name": "your-tag", "description": "Tag description"},
],
```

## Best Practices

### 1. **Always Document**

- Add summary and description to all endpoints
- Include example requests and responses
- Document error cases

### 2. **Use Meaningful Tags**

- Group related endpoints
- Keep tag names consistent
- Add descriptions to tags

### 3. **Specify Response Types**

- Document all possible HTTP status codes
- Specify serializers for success responses
- Document error response formats

### 4. **Include Examples**

- Add example values to serializer fields
- Use `OpenApiExample` for complex scenarios
- Show both success and error examples

### 5. **Version Your API**

- Use URL path versioning (`/api/v1/`)
- Document breaking changes
- Maintain backwards compatibility

## Configuration

All OpenAPI settings are in `popcornguess/settings.py`:

```python
SPECTACULAR_SETTINGS = {
    "TITLE": "PopcornGuess API",
    "DESCRIPTION": "...",
    "VERSION": "1.0.0",
    # ... more settings
}
```

Key settings:

- `TITLE`: API name
- `DESCRIPTION`: API description
- `VERSION`: Current API version
- `TAGS`: Endpoint groupings
- `CONTACT`: Team contact info
- `LICENSE`: API license

## Troubleshooting

### Schema Generation Errors

If schema generation fails:

```bash
# Check for errors
python manage.py spectacular --validate

# Generate schema to file
python manage.py spectacular --file schema.yaml
```

### Missing Endpoints

Ensure:

1. View is registered in URLs
2. View uses DRF viewsets or APIView
3. `DEFAULT_SCHEMA_CLASS` is set in REST_FRAMEWORK settings

### Authentication Issues

For session authentication:

1. Login through Django admin or API
2. Session cookie will be automatically included
3. CSRF token required for non-GET requests

## Future Enhancements

Planned improvements:

- [ ] JWT authentication support
- [ ] Webhook documentation
- [ ] Rate limiting documentation
- [ ] Filtering and searching guide
- [ ] Batch operations documentation
- [ ] Real-time updates (WebSocket)

## Resources

- [drf-spectacular Documentation](https://drf-spectacular.readthedocs.io/)
- [OpenAPI Specification](https://spec.openapis.org/oas/latest.html)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [ReDoc](https://redocly.com/redoc/)
- [OpenAPI Generator](https://openapi-generator.tech/)
