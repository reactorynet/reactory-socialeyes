import Reactory from '@reactorynet/reactory-core';

interface PostContentProps {
  reactory: Reactory.Client.IReactoryApi;
  post: any;
}

const PostContent = (props: PostContentProps) => {
  const { reactory, post } = props;

  const { React, Material } = reactory.getComponents<{
    React: Reactory.React;
    Material: Reactory.Client.Web.IMaterialModule;
  }>([
    'react.React',
    'material-ui.Material',
  ]);

  const { MaterialCore } = Material;
  const { Box, Typography, Chip, Divider, Link, Avatar } = MaterialCore;

  return (
    <Box sx={{ p: 2 }}>
      {/* Author Info */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        {post.author?.avatar && (
          <Avatar src={post.author.avatar} sx={{ width: 48, height: 48 }} />
        )}
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {post.author?.name || post.author?.username}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            @{post.author?.username}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
          {post.publishedAt ? new Date(post.publishedAt).toLocaleString() : ''}
        </Typography>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Post Content */}
      <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
        {post.content}
      </Typography>

      {/* Media */}
      {post.media && post.media.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Media</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {post.media.map((url: string, idx: number) => (
              <Box
                key={idx}
                component="img"
                src={url}
                sx={{
                  maxWidth: 200,
                  maxHeight: 200,
                  borderRadius: 1,
                  objectFit: 'cover',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
                alt={`Media ${idx + 1}`}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Hashtags */}
      {post.hashtags && post.hashtags.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Hashtags</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {post.hashtags.map((tag: string) => (
              <Chip key={tag} label={`#${tag}`} size="small" color="primary" variant="outlined" />
            ))}
          </Box>
        </Box>
      )}

      {/* Mentions */}
      {post.mentions && post.mentions.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Mentions</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {post.mentions.map((mention: string) => (
              <Chip key={mention} label={`@${mention}`} size="small" color="info" variant="outlined" />
            ))}
          </Box>
        </Box>
      )}

      {/* Link to Original */}
      {post.url && (
        <Box sx={{ mt: 2 }}>
          <Link
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            underline="hover"
          >
            View original post
          </Link>
        </Box>
      )}
    </Box>
  );
};

const Definition: any = {
  name: 'PostContent',
  nameSpace: 'socialeyes',
  version: '1.0.0',
  component: PostContent,
  roles: ['USER']
};

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    PostContent,
    ['SocialEyes', 'Feed'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', {
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`,
    component: PostContent
  });
}
