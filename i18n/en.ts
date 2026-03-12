const en = {
  common: {
    or: 'or',
    email: 'Email',
    password: 'Password',
    back: 'Back',
    save: 'Save',
    cancel: 'Cancel',
  },
  tabs: {
    home: 'Home',
    clients: 'Clients',
    jobs: 'Jobs',
    debts: 'Debts',
    settings: 'Settings',
  },
  screens: {
    home: {
      subtitle: 'Quick overview, reminders, and key info.',
      cardTitle: 'Quick overview',
      cardBody: 'Activity overview, debts, and recent changes will appear here.',
    },
    clients: {
      subtitle: 'Contacts, addresses, and job history.',
      cardTitle: 'Clients',
      cardBody: 'Browse and manage your clients.',
    },
    jobs: {
      subtitle: "Today's jobs, statuses, and scheduling.",
      cardTitle: 'List',
      cardBody: 'Job list and statuses will appear here.',
    },
    debts: {
      subtitle: 'Debts, payments, and invoices overview.',
      cardTitle: 'Overview',
      cardBody: 'Summary and debt list will appear here.',
    },
    settings: {
      subtitle: 'App settings.',
    },
  },
  clients: {
    add: 'Add client',
    edit: 'Edit client',
    nameLabel: 'Name',
    phoneLabel: 'Phone',
    addressLabel: 'Address',
    noteLabel: 'Note',
    searchPlaceholder: 'Search by name or phone',
    emptyTitle: 'No clients yet',
    emptyBody: 'Tap “Add client” to create your first client.',
    delete: 'Delete',
    deleteConfirmTitle: 'Delete client?',
    deleteConfirmMessage: 'This cannot be undone.',
  },
  settings: {
    darkTheme: 'Dark theme',
    darkThemeHelp: 'Enable/disable dark appearance.',
    language: 'Language',
    languageHelp: 'App language:',
    english: 'English',
    serbian: 'Serbian',
  },
  auth: {
    signIn: {
      title: 'Sign in',
      subtitle: 'Sign in to sync your data.',
      google: 'Continue with Google',
      submit: 'Sign in',
      forgot: 'Forgot password?',
      createAccount: 'Create account',
    },
    signUp: {
      title: 'Sign up',
      subtitle: 'Create an account for sync and backup.',
      google: 'Sign up with Google',
      submit: 'Create account',
      alreadyHave: 'Already have an account? Sign in',
      passwordPlaceholder: 'min 8 characters',
      checkEmail: 'Check your email, confirm the account, then sign in.',
    },
    resetPassword: {
      title: 'Password',
      subtitle: 'Send a reset link.',
      submit: 'Send link',
      backToSignIn: 'Back to sign in',
      sent: 'We sent a link to your email. Open it to change your password.',
    },
    placeholders: {
      email: 'email@domain.com',
      passwordMasked: '••••••••',
    },
  },
  userMenu: {
    buttonLabel: 'User menu',
    account: 'Account',
    closeMenu: 'Close menu',
    signOut: 'Sign out',
    unknownUser: 'Unknown user',
  },
  authCallback: {
    connecting: 'Connecting account…',
  },
  notFound: {
    title: 'Oops!',
    message: "This screen doesn't exist.",
    goHome: 'Go to home screen!',
  },
  modal: {
    title: 'Modal',
  },
  editScreenInfo: {
    openCode: 'Open up the code for this screen:',
    changeText: 'Change any of the text, save the file, and your app will automatically update.',
    tapHere:
      "Tap here if your app doesn't automatically update after making changes",
  },
};

export default en;
