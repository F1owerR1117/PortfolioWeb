// Components main aggregator
// Merge all sub-modules into a single Components object
var Components = Object.assign(
  {},
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
  ComponentsAdmin,
  {
    // Shared state variables
    currentPage: 1, hasMore: false, isLoading: false, currentPost: null,
    editorBlocks: [], editorMode: null, editorPostId: null, _editorCategory: 'work', _deletedBlockIds: [],
    _avatarState: null, _highlightCommentId: null, allPosts: [],
    _searchQuery: '', _activeTag: null, _sortMode: 'latest', _currentCategory: null, _reportStatus: 'pending',
    _commentPage: 1, _commentPageSize: 30, _tagCategory: 'all',
    currentReports: [], _musicTab: 'songs', _currentBookmarkColId: null,
    _levelConfigCache: null, _levelConfigMap: {},
    _onlinePollTimer: null, _chatOnlineTimer: null, _chatPollTimer: null,
    _chatLastMsgId: 0, _savedExpanded: null
  }
);
