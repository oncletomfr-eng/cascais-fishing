# Contributing to Cascais Fishing Platform

Thank you for your interest in contributing to the Cascais Fishing Platform! This guide will help you understand our development process and how to submit contributions.

## 📋 Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Documentation Guidelines](#documentation-guidelines)
- [Issue Guidelines](#issue-guidelines)

## 🤝 Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please:

- Be respectful and constructive in all interactions
- Welcome newcomers and help them get started
- Focus on what is best for the community and project
- Show empathy towards other community members

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Git
- Familiarity with TypeScript, React, and Next.js
- Read our [Developer Guide](DEVELOPER_GUIDE.md)

### Setup Development Environment
1. Fork the repository
2. Clone your fork locally
3. Follow the [Developer Setup Guide](DEVELOPER_GUIDE.md)
4. Verify everything works with `npm run dev`

## 🔄 Development Workflow

### 1. Choose an Issue
- Look for issues labeled `good first issue` for beginners
- Check the issue is not already assigned
- Comment on the issue to express interest
- Wait for maintainer confirmation before starting

### 2. Create a Branch
```bash
# Create and switch to a new branch
git checkout -b feature/issue-number-brief-description

# Examples:
git checkout -b feature/123-add-user-profiles
git checkout -b fix/456-chat-connection-issue
git checkout -b docs/789-update-readme
```

### 3. Development Process
```bash
# Start development server
npm run dev

# Make your changes following our coding standards

# Run checks frequently
npm run lint
npm run type-check
npm run test
```

### 4. Commit Your Changes
```bash
# Stage your changes
git add .

# Commit with descriptive message
git commit -m "feat: add user profile management

- Add user profile creation form
- Implement profile image upload
- Add validation for required fields
- Include tests for profile operations

Closes #123"
```

## 📥 Pull Request Process

### Before Submitting
- [ ] All tests pass (`npm run test`)
- [ ] TypeScript compilation clean (`npm run type-check`)
- [ ] Code follows linting rules (`npm run lint`)
- [ ] Changes are properly tested
- [ ] Documentation updated if needed

### PR Title Format
Use the same format as commit messages:
```
type(scope): brief description

Examples:
feat(auth): add Google OAuth integration
fix(chat): resolve message ordering issue
docs(api): update endpoint documentation
```

### PR Description Template
```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## Related Issue
Closes #[issue number]

## Testing
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] All new and existing unit tests pass locally
- [ ] I have tested this change manually in the browser

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Checklist
- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

### Review Process
1. **Automated Checks**: GitHub Actions will run tests and linting
2. **Code Review**: Team members will review your code
3. **Feedback**: Address any requested changes
4. **Approval**: After approval, maintainers will merge

## 💻 Coding Standards

### TypeScript Guidelines
```typescript
// Use proper typing, avoid 'any'
interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

// Use async/await over promises
async function getUserProfile(id: string): Promise<UserProfile> {
  const profile = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, avatar: true }
  });
  
  if (!profile) {
    throw new Error('User profile not found');
  }
  
  return profile;
}

// Use proper error handling
try {
  const profile = await getUserProfile(userId);
  return NextResponse.json(profile);
} catch (error) {
  console.error('Failed to get user profile:', error);
  return NextResponse.json(
    { error: 'Profile not found' },
    { status: 404 }
  );
}
```

### React Component Guidelines
```tsx
// Use functional components with TypeScript
interface UserCardProps {
  user: User;
  onClick?: (userId: string) => void;
}

export function UserCard({ user, onClick }: UserCardProps) {
  const handleClick = useCallback(() => {
    onClick?.(user.id);
  }, [onClick, user.id]);

  return (
    <div 
      className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
      onClick={handleClick}
    >
      <h3 className="font-semibold">{user.name}</h3>
      <p className="text-gray-600">{user.email}</p>
    </div>
  );
}
```

### API Route Guidelines
```typescript
// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, email: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### CSS/Styling Guidelines
- Use Tailwind CSS utility classes
- Follow mobile-first responsive design
- Use semantic HTML elements
- Ensure accessibility standards (WCAG 2.1)

## 🧪 Testing Requirements

### Unit Tests
```typescript
// __tests__/utils/validation.test.ts
import { validateEmail } from '@/lib/utils/validation';

describe('validateEmail', () => {
  test('should validate correct email addresses', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('user.name+tag@example.com')).toBe(true);
  });

  test('should reject invalid email addresses', () => {
    expect(validateEmail('invalid-email')).toBe(false);
    expect(validateEmail('')).toBe(false);
    expect(validateEmail(null)).toBe(false);
  });
});
```

### Integration Tests
```typescript
// __tests__/api/users.test.ts
import { createMocks } from 'node-mocks-http';
import handler from '@/app/api/users/route';

describe('/api/users', () => {
  test('should return users list', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(Array.isArray(data)).toBe(true);
  });
});
```

### Test Requirements
- All new features must include tests
- Bug fixes should include regression tests
- Aim for >80% code coverage
- Test both happy path and error cases

## 📝 Documentation Guidelines

### Code Comments
```typescript
/**
 * Calculates the fishing score based on various factors
 * @param tripData - The fishing trip data
 * @param weatherConditions - Current weather conditions
 * @returns Calculated fishing score between 0-100
 */
function calculateFishingScore(
  tripData: TripData,
  weatherConditions: WeatherData
): number {
  // Implementation...
}
```

### API Documentation
```typescript
/**
 * @swagger
 * /api/trips:
 *   post:
 *     summary: Create a new fishing trip
 *     tags: [Trips]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTripRequest'
 *     responses:
 *       201:
 *         description: Trip created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Trip'
 */
```

### README Updates
When adding new features or making significant changes:
- Update installation instructions if needed
- Add new environment variables to setup section
- Update feature list
- Include usage examples

## 🐛 Issue Guidelines

### Bug Reports
When reporting bugs, include:
- **Clear Title**: Descriptive summary
- **Environment**: OS, browser, Node.js version
- **Steps to Reproduce**: Detailed steps
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Screenshots**: If applicable
- **Additional Context**: Logs, error messages

### Feature Requests
When requesting features, include:
- **Clear Title**: Concise feature description
- **Problem Statement**: What problem does this solve?
- **Proposed Solution**: How should it work?
- **Alternatives**: Other solutions considered
- **Additional Context**: Use cases, examples

## 🏷️ Commit Message Format

We follow [Conventional Commits](https://conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

### Scopes
- `auth`: Authentication related
- `chat`: Chat system
- `booking`: Trip booking
- `ui`: User interface
- `api`: API endpoints
- `db`: Database related
- `docs`: Documentation

### Examples
```
feat(auth): add Google OAuth integration
fix(chat): resolve message ordering issue
docs(api): update endpoint documentation
style(ui): improve button component spacing
refactor(db): optimize user queries
test(booking): add trip creation tests
chore(deps): update dependencies
```

## 🔍 Review Criteria

Code reviews will evaluate:

### Functionality
- Does the code work as intended?
- Are edge cases handled?
- Is error handling appropriate?

### Code Quality
- Is the code readable and maintainable?
- Are naming conventions followed?
- Is the code properly structured?

### Performance
- Are there any performance implications?
- Is the solution efficient?
- Are database queries optimized?

### Security
- Are there any security vulnerabilities?
- Is user input properly validated?
- Are authentication checks in place?

### Testing
- Are tests comprehensive?
- Do tests cover edge cases?
- Are integration points tested?

## 🚀 Release Process

### Semantic Versioning
We follow [SemVer](https://semver.org/):
- **Major** (1.0.0): Breaking changes
- **Minor** (0.1.0): New features, backward compatible
- **Patch** (0.0.1): Bug fixes, backward compatible

### Release Cycle
- **Major releases**: Quarterly
- **Minor releases**: Monthly
- **Patch releases**: As needed for bug fixes

## 🆘 Getting Help

### Where to Ask Questions
1. **GitHub Discussions**: General questions and ideas
2. **Slack #engineering**: Quick questions for team members
3. **GitHub Issues**: Bug reports and feature requests
4. **Code Reviews**: Learning opportunities during PR reviews

### Documentation Resources
- [Developer Guide](DEVELOPER_GUIDE.md)
- [Operations Runbook](OPERATIONS_RUNBOOK.md)
- [API Documentation](API.md)

---

Thank you for contributing to Cascais Fishing Platform! Your contributions help make fishing more accessible and enjoyable for everyone.

**Last Updated**: January 10, 2025
**Version**: 1.0
