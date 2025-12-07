# New Features & Tables

## 🆕 New Database Tables

### 1. **projects** - Organize algorithms into projects
- Group related algorithms together
- Color coding for visual organization
- Archive functionality

### 2. **project_algorithms** - Many-to-many relationship
- Links algorithms to projects
- Tracks when algorithms were added

### 3. **collections** - User-created collections
- Public or private collections
- Share curated algorithm sets
- Discover public collections

### 4. **collection_algorithms** - Collection membership
- Links algorithms to collections

### 5. **comments** - Discussion system
- Comment on algorithms
- Nested replies (threaded comments)
- Edit/delete own comments

### 6. **favorites** - Bookmark system
- Save favorite algorithms
- Quick access to bookmarked items

### 7. **shares** - Sharing system
- Share algorithms with specific users
- Public share links with tokens
- Permission levels (view/edit/comment)
- Expiration dates

### 8. **notifications** - User notifications
- Comment notifications
- Share notifications
- Like notifications
- System notifications
- Read/unread status

### 9. **exports** - Export history
- Track export operations
- Export to JSON or Markdown
- Export single or multiple algorithms
- Export entire collections

### 10. **templates** - Reusable templates
- Create algorithm templates
- Public template library
- Usage tracking

### 11. **user_profiles** - Extended user info
- Bio, avatar, website
- Location
- User preferences (JSON)

### 12. **activity_log** - Activity tracking
- Track user actions
- Audit trail
- Analytics data

### 13. **algorithm_likes** - Like system
- Like algorithms
- Like counts
- Who liked what

### 14. **Algorithm Visibility** (added to algorithms table)
- `visibility`: private, public, unlisted
- `view_count`: Track views
- `like_count`: Track likes

## 🎯 New API Endpoints

### Projects
- `GET /api/projects` - List user's projects
- `GET /api/projects/:id` - Get project with algorithms
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `POST /api/projects/:id/algorithms` - Add algorithm to project
- `DELETE /api/projects/:id/algorithms/:algorithmId` - Remove algorithm

### Collections
- `GET /api/collections` - List user's collections
- `GET /api/collections/public` - Browse public collections
- `GET /api/collections/:id` - Get collection with algorithms
- `POST /api/collections` - Create collection
- `PUT /api/collections/:id` - Update collection
- `DELETE /api/collections/:id` - Delete collection
- `POST /api/collections/:id/algorithms` - Add algorithm
- `DELETE /api/collections/:id/algorithms/:algorithmId` - Remove algorithm

### Favorites
- `GET /api/favorites` - Get user's favorites
- `POST /api/favorites/:algorithmId` - Add to favorites
- `DELETE /api/favorites/:algorithmId` - Remove from favorites
- `GET /api/favorites/:algorithmId/check` - Check if favorited

### Comments
- `GET /api/comments/algorithm/:algorithmId` - Get comments (threaded)
- `POST /api/comments/algorithm/:algorithmId` - Create comment
- `PUT /api/comments/:id` - Update comment
- `DELETE /api/comments/:id` - Delete comment

### Notifications
- `GET /api/notifications` - Get notifications
- `GET /api/notifications/unread-count` - Get unread count
- `PATCH /api/notifications/:id/read` - Mark as read
- `PATCH /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification

### Exports
- `GET /api/exports` - Get export history
- `POST /api/exports` - Create export (JSON/Markdown)
  - Body: `{ algorithmIds: [1,2,3] }` or `{ collectionId: 1 }`
  - Returns: `{ fileName, content, size, type }`

### Sharing
- `POST /api/sharing` - Share algorithm
- `GET /api/sharing/received` - Get algorithms shared with me
- `GET /api/sharing/sent` - Get algorithms I shared
- `GET /api/sharing/token/:token` - Access via share token
- `DELETE /api/sharing/:id` - Revoke share

### Likes
- `POST /api/likes/:algorithmId` - Like algorithm
- `DELETE /api/likes/:algorithmId` - Unlike algorithm
- `GET /api/likes/:algorithmId` - Get likes list

### Enhanced Algorithms
- `GET /api/algorithms?visibility=public&type=hybrid&search=optimization` - Filtering
- Algorithms now include: `isFavorited`, `isLiked`, `viewCount`, `likeCount`

## 🚀 New Features

### 1. **Projects & Organization**
- Organize algorithms into projects
- Color-coded projects
- Archive projects
- Project-based workflow

### 2. **Collections**
- Create public/private collections
- Discover public collections
- Curate algorithm sets
- Share collections

### 3. **Social Features**
- Comment on algorithms
- Threaded discussions
- Like algorithms
- Share with users or public links
- Notifications for interactions

### 4. **Favorites & Bookmarks**
- Bookmark favorite algorithms
- Quick access to favorites
- Personal algorithm library

### 5. **Export Functionality**
- Export to JSON
- Export to Markdown
- Export single or multiple algorithms
- Export entire collections
- Export history tracking

### 6. **Visibility Control**
- Private algorithms (default)
- Public algorithms (discoverable)
- Unlisted algorithms (link-only access)
- View tracking
- Like counts

### 7. **Notifications System**
- Real-time notifications
- Comment notifications
- Share notifications
- Like notifications
- Unread count
- Mark as read functionality

### 8. **Sharing System**
- Share with specific users
- Public share links with tokens
- Permission levels (view/edit/comment)
- Expiration dates
- Revoke sharing

### 9. **Enhanced Search & Filtering**
- Search by name, domain, description
- Filter by visibility
- Filter by type
- Combined filters

### 10. **Activity Tracking**
- Track user actions
- Audit trail
- Analytics data
- Activity log

## 📊 Database Schema Summary

**Total Tables: 20**

1. users
2. algorithms
3. algorithm_versions
4. algorithm_analysis
5. jobs
6. sessions
7. **projects** ⭐ NEW
8. **project_algorithms** ⭐ NEW
9. **collections** ⭐ NEW
10. **collection_algorithms** ⭐ NEW
11. **comments** ⭐ NEW
12. **favorites** ⭐ NEW
13. **shares** ⭐ NEW
14. **notifications** ⭐ NEW
15. **exports** ⭐ NEW
16. **templates** ⭐ NEW
17. **user_profiles** ⭐ NEW
18. **activity_log** ⭐ NEW
19. **algorithm_likes** ⭐ NEW

## 🔄 Migration Notes

The schema automatically adds new tables on backend startup. Existing algorithms will:
- Default to `visibility = 'private'`
- Have `view_count = 0` and `like_count = 0`
- Be accessible via existing endpoints

No data migration needed - all new features work with existing data!

## 🎨 Frontend Integration (Next Steps)

These features are ready for frontend integration:
- Projects UI
- Collections browser
- Comments section
- Favorites sidebar
- Notifications bell
- Share dialog
- Export button
- Like button
- Visibility toggle

