// Components main aggregator — Object.assign for backward compat + namespaces for clarity
var Components = Object.assign(
  // ---- Base object: shared state + namespace refs ----
  {
    // Shared state
    currentPage: 1, hasMore: false, isLoading: false, currentPost: null,
    editorBlocks: [], editorMode: null, editorPostId: null, _editorCategory: 'work', _deletedBlockIds: [],
    _avatarState: null, _highlightCommentId: null, allPosts: [],
    _searchQuery: '', _activeTag: null, _sortMode: 'latest', _currentCategory: null, _reportStatus: 'pending',
    _commentPage: 1, _commentPageSize: 30, _tagCategory: 'all',
    currentReports: [], _musicTab: 'songs', _currentBookmarkColId: null,
    _levelConfigCache: null, _levelConfigMap: {},
    _onlinePollTimer: null, _chatOnlineTimer: null, _chatPollTimer: null,
    _chatLastMsgId: 0, _savedExpanded: null,

    // Namespaced references (for direct access without collision)
    Shared:          ComponentsShared,
    Auth:            ComponentsAuth,
    PostList:        ComponentsPostList,
    PostDetail:      ComponentsPostDetail,
    PostEditor:      ComponentsPostEditor,
    Profile:         ComponentsProfile,
    Notifications:   ComponentsNotifications,
    Bookmarks:       ComponentsBookmarks,
    MusicLibrary:    ComponentsMusicLibrary,
    Friends:         ComponentsFriends,
    Chat:            ComponentsChat,
    AdminTags:       ComponentsAdminTags,
    AdminStats:      ComponentsAdminStats,
    AdminReports:    ComponentsAdminReports,
    AdminUsers:      ComponentsAdminUsers,
    AdminAppend:     ComponentsAdminAppend,
    Admin:           ComponentsAdmin,
    Ads:             ComponentsAds
  },

  // ---- Merge all module methods into flat Components (this = Components inside methods) ----
  ComponentsShared,
  ComponentsAuth,
  ComponentsPostList,
  ComponentsPostDetail,
  ComponentsPostEditor,
  ComponentsProfile,
  ComponentsNotifications,
  ComponentsBookmarks,
  ComponentsMusicLibrary,
  ComponentsFriends,
  ComponentsChat,
  ComponentsAdminTags,
  ComponentsAdminStats,
  ComponentsAdminReports,
  ComponentsAdminUsers,
  ComponentsAdminAppend,
  ComponentsAdmin,
  ComponentsAds
);

// If any nested module also has a _musicTab etc., it was overwritten by Object.assign.
// The shared state values on the base object take precedence.
// To use namespaced access: Components.MusicLibrary.renderMusicLibrary()
// To use flat access (backward compat): Components.renderMusicLibrary()
