export const Errors = {
  Group: {
    EmptyMembersList: 'At least one of userIds or groupIds must be provided.',
    IdNotExist: 'At least one of group ids do not exist.',
  },
  User: {
    IdNotExist: 'At least one of user ids do not exist.',
    NotFound: 'User not found',
  },
  Tweet: {
    ParentTweetNotFound: 'Parent tweet not found',
    AuthorNotFound: 'Author of tweet not found',
    NotFound: 'Tweet not found',
    NegativeLimit: 'Limit must be greater than 0',
    NegativePage: 'Page must be greater than 0',
  },
};
