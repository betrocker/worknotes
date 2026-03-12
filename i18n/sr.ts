const sr = {
  common: {
    or: 'ili',
    email: 'Email',
    password: 'Lozinka',
    back: 'Nazad',
    save: 'Sačuvaj',
    cancel: 'Otkaži',
  },
  tabs: {
    home: 'Početna',
    clients: 'Klijenti',
    jobs: 'Poslovi',
    debts: 'Dugovanja',
    settings: 'Podešavanja',
  },
  screens: {
    home: {
      subtitle: 'Brzi pregled, podsetnici i najvažnije informacije.',
      cardTitle: 'Brzi pregled',
      cardBody: 'Ovde će biti pregled aktivnosti, dugovanja i poslednjih izmena.',
    },
    clients: {
      subtitle: 'Kontakti, adrese i istorija poslova.',
      cardTitle: 'Klijenti',
      cardBody: 'Pregled i upravljanje klijentima.',
    },
    jobs: {
      subtitle: 'Danasnji poslovi, statusi i zakazivanja.',
      cardTitle: 'Lista',
      cardBody: 'Ovde će ići lista poslova i statusi.',
    },
    debts: {
      subtitle: 'Pregled dugovanja, uplata i računa.',
      cardTitle: 'Pregled',
      cardBody: 'Ovde će biti sumarno stanje i lista dugovanja.',
    },
    settings: {
      subtitle: 'Podešavanja aplikacije.',
    },
  },
  clients: {
    add: 'Dodaj klijenta',
    edit: 'Izmeni klijenta',
    nameLabel: 'Ime',
    phoneLabel: 'Telefon',
    addressLabel: 'Adresa',
    noteLabel: 'Napomena',
    searchPlaceholder: 'Pretraga po imenu ili telefonu',
    emptyTitle: 'Nema klijenata',
    emptyBody: 'Tapni “Dodaj klijenta” da uneseš prvog klijenta.',
    delete: 'Obriši',
    deleteConfirmTitle: 'Obriši klijenta?',
    deleteConfirmMessage: 'Ova akcija se ne može poništiti.',
  },
  settings: {
    darkTheme: 'Tamna tema',
    darkThemeHelp: 'Uključi/isključi tamni izgled.',
    language: 'Jezik',
    languageHelp: 'Jezik aplikacije:',
    english: 'Engleski',
    serbian: 'Srpski',
  },
  auth: {
    signIn: {
      title: 'Prijava',
      subtitle: 'Uloguj se da sinhronizuješ podatke.',
      google: 'Nastavi sa Google',
      submit: 'Prijavi se',
      forgot: 'Zaboravljena lozinka?',
      createAccount: 'Napravi nalog',
    },
    signUp: {
      title: 'Registracija',
      subtitle: 'Napravi nalog za sync i backup.',
      google: 'Registruj se sa Google',
      submit: 'Napravi nalog',
      alreadyHave: 'Već imaš nalog? Prijavi se',
      passwordPlaceholder: 'min 8 karaktera',
      checkEmail: 'Proveri email i potvrdi nalog, pa se uloguj.',
    },
    resetPassword: {
      title: 'Lozinka',
      subtitle: 'Pošalji link za reset.',
      submit: 'Pošalji link',
      backToSignIn: 'Nazad na prijavu',
      sent: 'Poslali smo link na email. Otvori ga da promeniš lozinku.',
    },
    placeholders: {
      email: 'email@domen.com',
      passwordMasked: '••••••••',
    },
  },
  userMenu: {
    buttonLabel: 'Korisnički meni',
    account: 'Nalog',
    closeMenu: 'Zatvori meni',
    signOut: 'Odjavi se',
    unknownUser: 'Nepoznat korisnik',
  },
  authCallback: {
    connecting: 'Povezivanje naloga…',
  },
  notFound: {
    title: 'Ups!',
    message: 'Ovaj ekran ne postoji.',
    goHome: 'Nazad na početnu!',
  },
  modal: {
    title: 'Modal',
  },
  editScreenInfo: {
    openCode: 'Otvori kod za ovaj ekran:',
    changeText: 'Promeni tekst, sačuvaj fajl i aplikacija će se automatski osvežiti.',
    tapHere: 'Tapni ovde ako se aplikacija ne osveži automatski posle izmene',
  },
};

export default sr;
