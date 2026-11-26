import Reactory from '@reactorynet/reactory-core';

interface ConnectAccountDialogDependencies {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
}

interface ConnectAccountDialogProps {
  reactory: Reactory.Client.IReactoryApi;
  open: boolean;
  onComplete: (account?: any) => void;
  onCancel: () => void;
}

const PLATFORMS = [
  { value: 'x', label: 'X (Twitter)', icon: 'tag', color: '#000000' },
  { value: 'reddit', label: 'Reddit', icon: 'forum', color: '#FF4500' },
];

const ConnectAccountDialog = (props: ConnectAccountDialogProps) => {
  const { reactory, open, onComplete, onCancel } = props;

  const {
    React,
    Material,
  } = reactory.getComponents<ConnectAccountDialogDependencies>([
    'react.React',
    'material-ui.Material',
  ]);

  const { MaterialCore } = Material;
  const {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Typography,
    Alert,
    CircularProgress,
    Stepper,
    Step,
    StepLabel,
    Icon,
    MenuItem,
    Chip,
    IconButton,
    Avatar,
    Tooltip,
  } = MaterialCore;

  if (!React || !Material) return null;

  const [activeStep, setActiveStep] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const [formData, setFormData] = React.useState({
    platform: '',
    accessToken: '',
    refreshToken: '',
    providerAccountId: '',
    name: '',
    email: '',
    scopes: [] as string[],
  });

  const [scopeInput, setScopeInput] = React.useState('');

  const [lookupUsername, setLookupUsername] = React.useState('');
  const [lookupLoading, setLookupLoading] = React.useState(false);
  const [lookupResult, setLookupResult] = React.useState<any>(null);
  const [lookupError, setLookupError] = React.useState<string | null>(null);

  const steps = ['Select Platform', 'Account Details', 'Credentials'];

  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const addScope = () => {
    const trimmed = scopeInput.trim();
    if (trimmed && !formData.scopes.includes(trimmed)) {
      updateField('scopes', [...formData.scopes, trimmed]);
      setScopeInput('');
    }
  };

  const removeScope = (scope: string) => {
    updateField('scopes', formData.scopes.filter((s: string) => s !== scope));
  };

  const handleLookup = async () => {
    const username = lookupUsername.trim().replace(/^[@u\/]+/, '');
    if (!username) return;
    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);

    try {
      const result = await reactory.graphqlQuery(
        `query SocialEyesLookupAccount($input: SocialEyesAccountLookupInput!) {
          socialEyesLookupAccount(input: $input) {
            id
            username
            name
            avatar
            bio
            followerCount
            verified
            url
          }
        }`,
        { input: { platform: formData.platform, username } },
      );

      const found = result?.data?.socialEyesLookupAccount;
      if (found) {
        setLookupResult(found);
        updateField('providerAccountId', found.id);
        if (!formData.name) {
          const handle = formData.platform === 'reddit' ? `u/${found.username}` : `@${found.username}`;
          updateField('name', handle);
        }
      } else {
        setLookupError('Account not found. Please enter the Platform Account ID manually.');
      }
    } catch (err: any) {
      setLookupError('Lookup failed. Please enter the Platform Account ID manually.');
    } finally {
      setLookupLoading(false);
    }
  };

  const canAdvance = () => {
    switch (activeStep) {
      case 0:
        return !!formData.platform;
      case 1:
        return !!formData.providerAccountId && !!formData.name;
      case 2:
        return !!formData.accessToken;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep((prev: number) => prev + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep((prev: number) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const input: Record<string, any> = {
        platform: formData.platform,
        accessToken: formData.accessToken,
        providerAccountId: formData.providerAccountId,
        name: formData.name,
      };

      if (formData.refreshToken) input.refreshToken = formData.refreshToken;
      if (formData.email) input.email = formData.email;
      if (formData.scopes.length > 0) input.scopes = formData.scopes;

      const result = await reactory.graphqlMutation(
        `mutation SocialEyesConnectAccount($input: SocialEyesConnectAccountInput!) {
          socialEyesConnectAccount(input: $input) {
            id
            provider
            providerAccountId
            name
            email
            avatar
            profileUrl
            isActive
            scopes
            createdAt
            updatedAt
          }
        }`,
        { input },
        {},
      );

      if (result.errors && result.errors.length > 0) {
        setError(result.errors.map((e: any) => e.message).join('; '));
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setSubmitting(false);

      // Brief delay so the user sees success, then close
      setTimeout(() => {
        onComplete(result.data?.socialEyesConnectAccount);
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to connect account');
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setActiveStep(0);
      setFormData({
        platform: '',
        accessToken: '',
        refreshToken: '',
        providerAccountId: '',
        name: '',
        email: '',
        scopes: [],
      });
      setError(null);
      setSuccess(false);
      setLookupUsername('');
      setLookupResult(null);
      setLookupError(null);
      onCancel();
    }
  };

  const selectedPlatform = PLATFORMS.find((p) => p.value === formData.platform);

  // ─── Step Content Renderers ───

  const renderPlatformStep = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
      <Typography variant="body2" color="text.secondary">
        Select the social media platform you want to connect.
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 1 }}>
        {PLATFORMS.map((platform) => {
          const isSelected = formData.platform === platform.value;
          return (
            <Box
              key={platform.value}
              onClick={() => updateField('platform', platform.value)}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
                p: 3,
                borderRadius: 2,
                border: isSelected ? '2px solid' : '1px solid',
                borderColor: isSelected ? 'primary.main' : 'divider',
                backgroundColor: isSelected ? 'action.selected' : 'background.paper',
                cursor: 'pointer',
                minWidth: 140,
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: 'primary.light',
                  backgroundColor: 'action.hover',
                },
              }}
            >
              <Icon sx={{ fontSize: 40, color: platform.color }}>
                {platform.icon}
              </Icon>
              <Typography variant="subtitle1" sx={{
                fontWeight: isSelected ? 700 : 400
              }}>
                {platform.label}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );

  const renderDetailsStep = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
      <Typography variant="body2" color="text.secondary">
        Enter the account details for your {selectedPlatform?.label || ''} account.
      </Typography>

      {/* ── Account Lookup ── */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Look Up Account
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          <TextField
            size="small"
            label={formData.platform === 'reddit' ? 'Reddit username (without u/)' : 'Username / handle (without @)'}
            value={lookupUsername}
            onChange={(e: any) => setLookupUsername(e.target.value)}
            onKeyDown={(e: any) => { if (e.key === 'Enter') { e.preventDefault(); handleLookup(); } }}
            sx={{ flex: 1 }}
            disabled={lookupLoading}
          />
          <Tooltip title="Look up the account to auto-fill the Platform ID">
            <span>
              <Button
                variant="outlined"
                size="small"
                onClick={handleLookup}
                disabled={!lookupUsername.trim() || lookupLoading}
                startIcon={lookupLoading ? <CircularProgress size={14} /> : <Icon>search</Icon>}
                sx={{ whiteSpace: 'nowrap', mt: 0.25 }}
              >
                {lookupLoading ? 'Looking up…' : 'Look Up'}
              </Button>
            </span>
          </Tooltip>
        </Box>

        {lookupError && (
          <Alert severity="warning" sx={{ mt: 1 }} onClose={() => setLookupError(null)}>
            {lookupError}
          </Alert>
        )}

        {lookupResult && (
          <Box
            sx={{
              mt: 1,
              p: 1.5,
              border: '1px solid',
              borderColor: 'success.light',
              borderRadius: 1,
              bgcolor: 'success.50',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            {lookupResult.avatar && (
              <Avatar src={lookupResult.avatar} sx={{ width: 40, height: 40 }} />
            )}
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="body2" noWrap sx={{
                  fontWeight: 600
                }}>
                  {lookupResult.name || lookupResult.username}
                </Typography>
                {lookupResult.verified && (
                  <Icon sx={{ fontSize: 16, color: 'primary.main' }}>verified</Icon>
                )}
              </Box>
              <Typography variant="caption" color="text.secondary" noWrap>
                @{lookupResult.username}
                {lookupResult.followerCount != null && ` · ${lookupResult.followerCount.toLocaleString()} followers`}
              </Typography>
            </Box>
            <Icon sx={{ color: 'success.main' }}>check_circle</Icon>
          </Box>
        )}
      </Box>

      {/* ── Manual / Auto-filled Fields ── */}
      <TextField
        label="Account ID on Platform"
        value={formData.providerAccountId}
        onChange={(e: any) => updateField('providerAccountId', e.target.value)}
        required
        fullWidth
        helperText={
          lookupResult
            ? 'Auto-filled from lookup — you can still edit this manually'
            : formData.platform === 'x'
            ? 'Your X/Twitter user ID (numeric) — use Look Up to find it automatically'
            : 'Your Reddit username (without u/) — use Look Up to find it automatically'
        }
      />
      <TextField
        label="Display Name / Handle"
        value={formData.name}
        onChange={(e: any) => updateField('name', e.target.value)}
        required
        fullWidth
        helperText={
          formData.platform === 'x'
            ? 'e.g. @yourusername'
            : 'e.g. u/yourusername'
        }
      />
      <TextField
        label="Email (optional)"
        value={formData.email}
        onChange={(e: any) => updateField('email', e.target.value)}
        fullWidth
        type="email"
      />
    </Box>
  );

  const renderCredentialsStep = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
      <Typography variant="body2" color="text.secondary">
        Enter the OAuth credentials for your {selectedPlatform?.label || ''} account.
      </Typography>

      {formData.platform === 'x' && (
        <Alert severity="info" sx={{ mb: 1 }}>
          You can obtain a Bearer Token from the X Developer Portal under your App's
          "Keys and tokens" section.
        </Alert>
      )}

      {formData.platform === 'reddit' && (
        <Alert severity="info" sx={{ mb: 1 }}>
          Create a Reddit app at reddit.com/prefs/apps to get your credentials.
          Use the "script" or "web app" type.
        </Alert>
      )}

      <TextField
        label="Access Token / Bearer Token"
        value={formData.accessToken}
        onChange={(e: any) => updateField('accessToken', e.target.value)}
        required
        fullWidth
        type="password"
        autoComplete="off"
      />
      <TextField
        label="Refresh Token (optional)"
        value={formData.refreshToken}
        onChange={(e: any) => updateField('refreshToken', e.target.value)}
        fullWidth
        type="password"
        autoComplete="off"
        helperText="Required for auto-refreshing tokens when they expire"
      />

      <Box>
        <Typography variant="body2" sx={{ mb: 1 }}>
          OAuth Scopes (optional)
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="e.g. tweet.read"
            value={scopeInput}
            onChange={(e: any) => setScopeInput(e.target.value)}
            onKeyDown={(e: any) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addScope();
              }
            }}
            sx={{ flex: 1 }}
          />
          <Button
            size="small"
            variant="outlined"
            onClick={addScope}
            disabled={!scopeInput.trim()}
          >
            Add
          </Button>
        </Box>
        {formData.scopes.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
            {formData.scopes.map((scope: string) => (
              <Chip
                key={scope}
                label={scope}
                size="small"
                onDelete={() => removeScope(scope)}
              />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return renderPlatformStep();
      case 1:
        return renderDetailsStep();
      case 2:
        return renderCredentialsStep();
      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Icon color="primary">add_link</Icon>
        Connect Social Account
        <Box sx={{ flex: 1 }} />
        <IconButton size="small" onClick={handleClose} disabled={submitting}>
          <Icon>close</Icon>
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stepper activeStep={activeStep} sx={{ mb: 2 }}>
          {steps.map((label: string) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Account connected successfully!
          </Alert>
        )}

        {!success && renderStepContent()}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <Box sx={{ flex: 1 }} />
        {activeStep > 0 && (
          <Button onClick={handleBack} disabled={submitting}>
            Back
          </Button>
        )}
        {activeStep < steps.length - 1 ? (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={!canAdvance()}
          >
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!canAdvance() || submitting || success}
            startIcon={submitting ? <CircularProgress size={18} /> : <Icon>link</Icon>}
          >
            {submitting ? 'Connecting...' : 'Connect'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

const Definition: any = {
  name: 'ConnectAccountDialog',
  nameSpace: 'socialeyes',
  version: '1.0.0',
  component: ConnectAccountDialog,
  roles: ['USER'],
};

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    ConnectAccountDialog,
    ['SocialEyes', 'Dialog'],
    Definition.roles,
    true,
    [],
    'widget',
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', {
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`,
    component: ConnectAccountDialog,
  });
}

export default ConnectAccountDialog;
