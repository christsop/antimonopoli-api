import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const processedIdsFile = path.join(__dirname, 'processedIds.json');

function readProcessedIds() {
  try {
    if (fs.existsSync(processedIdsFile)) {
      const rawData = fs.readFileSync(processedIdsFile);
      return JSON.parse(rawData);
    }
    return []; // Return an empty array if no file exists
  } catch (error) {
    console.error("Error reading processed IDs:", error);
    return [];
  }
}

function saveProcessedIds(ids) {
  try {
    fs.writeFileSync(processedIdsFile, JSON.stringify(ids, null, 2));
  } catch (error) {
    console.error("Error saving processed IDs:", error);
  }
}

async function extractLinks(url) {
  try {
    // Fetch the webpage content
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch the webpage: ${response.statusText}`);
    }
    const html = await response.text();

    // Parse the HTML content
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Select the elements
    const theatro = document.querySelectorAll('.diagonismos_theatro a');
    const book = document.querySelectorAll('.diagonismos_book a');
    const th = document.querySelectorAll('.category_item');
    const small_title = document.querySelectorAll('.g_small_tile');

    // Combine all elements into one array
    const links = [...book, ...theatro, ...th, ...small_title];

    // Extract the href attributes
    const pageLinks = Array.from(links).map(link => link.href);

    return pageLinks;
  } catch (error) {
    console.error('Error:', error);
  }
}

// TODO For faster runs use only a random link when having custom events
const categories = [
  // 'https://www.google.com'
  'https://www.monopoli.gr/diagonismos/',
  'https://www.monopoli.gr/diagonismoi/proskliseis-gia-theatro',
  'https://www.monopoli.gr/diagonismoi/proskliseis-gia-theatro/page/2/',
  'https://www.monopoli.gr/diagonismoi/proskliseis-gia-theatro/page/3/',
  'https://www.monopoli.gr/diagonismoi/proskliseis-gia-theatro/page/4/',
  'https://www.monopoli.gr/diagonismoi/proskliseis-gia-geystikes-apolayseis/',
]

let pageLinks = [];

// TODO If I need custom links hardcode them in pageLinks here and comment out the following for loop
for (const category of categories) {
  const links = await extractLinks(category);
  pageLinks.push(...links);
}
// pageLinks = [
//   'https://www.monopoli.gr/diagonismos/diagonismos-eimai-i-gynaika-mou-me-ton-antoni-loudaro-sto-theatro-metaksourgeio-14/',

// ]

async function fetchAvailableDates(code) {
  try {
    // Fetch the HTML content of the page
    const response = await fetch(`https://www.monopoli.gr/contest-form/${code}/`);
    if (!response.ok) throw new Error(`Failed to fetch https://www.monopoli.gr/contest-form/${code}/`);

    const htmlText = await response.text();

    // Parse the HTML content using jsdom
    const dom = new JSDOM(htmlText);
    const document = dom.window.document;

    // Extract the hidden date (if present)
    const dateInput = document.querySelector('input[name="date"]');
    const hiddenDate = dateInput ? dateInput.value : null;

    // Extract the list of dates from the <select name="date">
    const dateSelect = document.querySelector('select[name="date"]');
    const dateOptions = dateSelect
      ? Array.from(dateSelect.querySelectorAll('option')).map(option => option.value)
      : [];

    // Combine hidden date (if it exists) with the list of dates
    const dates = hiddenDate ? [hiddenDate, ...dateOptions] : dateOptions;

    // Return the extracted dates
    return dates.length > 0 ? dates : null;
  } catch (error) {
    console.error(`Error fetching or parsing https://www.monopoli.gr/contest-form/${code}/:`, error);
    return null;
  }
}

async function fetchPageAndExtractCode(link) {
  try {
    // Fetch the HTML content of the page
    const response = await fetch(link);
    if (!response.ok) throw new Error(`Failed to fetch ${link}`);

    const htmlText = await response.text();

    // Parse the HTML content using jsdom
    const dom = new JSDOM(htmlText);
    const document = dom.window.document;

    // Find the <a> element with class "diagonismos_btn"
    const contestLink = document.querySelector('a.diagonismos_btn');

    if (contestLink && contestLink.href) {
      // Extract the numeric code from the href (e.g., "/contest-form/841967/")
      const match = contestLink.href.match(/contest-form\/(\d+)/);
      return match ? match[1] : null; // Return only the code (e.g., "841967")
    }
    return null;
  } catch (error) {
    console.error(`Error fetching or parsing ${link}:`, error);
    return null;
  }
}


async function getIdsAndDates(takeIntoAccountProcessedIds) {
  const processedIds = takeIntoAccountProcessedIds ? readProcessedIds() : [];
  const idAndDates = [];

  for (const link of pageLinks) {
      const code = await fetchPageAndExtractCode(link);
      if (code && !processedIds.includes(String(code))) {
        processedIds.push(code);
          const dates = await fetchAvailableDates(code);
          dates.forEach(date => {
              const obj = {
                  id: code,
                  dates: date,
                  link: link
              };
              idAndDates.push(obj);
          })
      }
  }
  saveProcessedIds(processedIds);
  if(idAndDates.length === 0) {
    console.log('No new events since last time');
  } else {
    console.log('Total new events: ', idAndDates.length);
  }
  return idAndDates;
}


async function processRequests(idsAndDates, users) {
  // TODO use custom id's and dates  array if you need specific events and times 
  // idsAndDates = [
  //   {
  //     id: '869803',
  //     dates: '11/04/2025 στις 21:00',
  //     link: 'https://www.monopoli.gr/diagonismos/diagonismos-itan-oloi-tous-paidia-mou-tou-arthour-miller-sto-theatro-alkyonis-10/'
  //   },
  //   {
  //     id: '869830',
  //     dates: '09/04/2025 στις 20:00',
  //     link: 'https://www.monopoli.gr/diagonismos/dr-strangelove-to-national-theatre-live-sto-megaro-me-ti-theatriki-metafora-tou-aristourgimatos-tou-kioumprik/'
  //   },
  //   {
  //     id: '868261',
  //     dates: '12/04/2025 στις 21:00',
  //     link: 'https://www.monopoli.gr/diagonismos/diagonismos-memorantoum-apo-tin-omada-the-young-quill-sto-theatro-mpellos-12/'
  //   },
  //   {
  //     id: '870034',
  //     dates: '12/04/2025 στις 18:15',
  //     link: 'https://www.monopoli.gr/diagonismos/diagonismos-votka-molotof-tis-elenis-rantou-ston-elliniko-kosmo-4/'
  //   },
  //   {
  //     id: '870048',
  //     dates: '12/04/2025 στις 18:00',
  //     link: 'https://www.monopoli.gr/diagonismos/diagonismos-frankenstein-eliza-tis-eris-kyrgia-sto-theatro-poreia-14/'
  //   },
  //   {
  //     id: '870048',
  //     dates: '13/04/2025 στις 18:00',
  //     link: 'https://www.monopoli.gr/diagonismos/diagonismos-frankenstein-eliza-tis-eris-kyrgia-sto-theatro-poreia-14/'
  //   },
  //   {
  //     id: '869589',
  //     dates: '07/04/2025 στις 21:00',
  //     link: 'https://www.monopoli.gr/diagonismos/diagonismos-terror-tou-ferntinant-fon-sirax-sto-theatro-vasilakou-marianna-toli-8/'
  //   },
  //   {
  //     id: '868368',
  //     dates: '06/04/2025 στις 16:00',
  //     link: 'https://www.monopoli.gr/diagonismos/diagonismos-to-agori-me-tis-dyo-kardies-ton-adelfon-amiri-sto-theatro-katerina-vasilakou-23/'
  //   },
  //   {
  //     id: '868368',
  //     dates: '07/04/2025 στις 19:00',
  //     link: 'https://www.monopoli.gr/diagonismos/diagonismos-to-agori-me-tis-dyo-kardies-ton-adelfon-amiri-sto-theatro-katerina-vasilakou-23/'
  //   }
  // ]
  for (const user of users) {
      for (const data of idsAndDates) {          
          fetch("https://www.monopoli.gr/contest-form/", {
              headers: {
                  "content-type": "application/x-www-form-urlencoded",
                  "sec-ch-ua": "\"Google Chrome\";v=\"131\", \"Chromium\";v=\"131\", \"Not_A Brand\";v=\"24\"",
                  "sec-ch-ua-mobile": "?0",
                  "sec-ch-ua-platform": "\"macOS\"",
                  "upgrade-insecure-requests": "1"
              },
              referrer: "https://www.monopoli.gr/contest-form/841813/",
              referrerPolicy: "strict-origin-when-cross-origin",
              body: `gender=${encodeURIComponent(user.gender)}&firstname=${encodeURIComponent(user.firstname)}&lastname=${encodeURIComponent(user.lastname)}&address=${encodeURIComponent(user.address)}&city=${encodeURIComponent(user.city)}&postal=${encodeURIComponent(user.postal)}&date=${encodeURIComponent(data.dates)}&phone=${encodeURIComponent(user.phone)}&email=${encodeURIComponent(user.email)}&job=${encodeURIComponent(user.job)}&age=${encodeURIComponent(user.age)}&gdpr=on&itemTitle=&itemID=${encodeURIComponent(data.id)}&submit=`,
              method: "POST",
              mode: "cors",
              credentials: "omit"
          })
          .then(response => {
            console.log(`User ${user.lastname} successfyully registered to event: ${data.id}`)
          })
          .catch(error => {
            console.log(`Error: User ${user.lastname} couldnt registered to event: ${data.id}`)
          });
          
          // Wait for 500ms before the next iteration
          await new Promise(resolve => setTimeout(resolve, 500));
      }
  }
}

const users = [
  {
      gender: "Κος",
      firstname: "Χρήστος",
      lastname: "Τσοπέλας",
      address: "Μενελάου 25",
      city: "Καλλιθέα",
      postal: "17672",
      phone: "6934831454",
      email: "tsopelasat@gmail.com",
      job: "Ιδιωτ. Υπαλληλος",
      age: "19-30"
  },
  {
    gender: "Κα",
    firstname: "Ελένη",
    lastname: "Κοσεογλου",
    address: "Μενελάου 25",
    city: "Αθήνα",
    postal: "17672",
    phone: "6981723853",
    email: "eleni.koseoglou.94@gmail.com",
    job: "Ιδιωτ. Υπαλληλος",
    age: "19-30"
  },
  {
      gender: "Κα",
      firstname: "Ελένη",
      lastname: "Τσεντιδου",
      address: "Μενελάου 25",
      city: "Αθήνα",
      postal: "17672",
      phone: "6981723853",
      email: "amanitamouscaria@hotmail.com",
      job: "Ιδιωτ. Υπαλληλος",
      age: "19-30"
  },
  {
    gender: "Κος",
    firstname: "Λευτερης",
    lastname: "Μοριτς",
    address: "Σπαρτης 7",
    city: "Αθηνα",
    postal: "10431",
    phone: "6975368952",
    email: "elmorits@yahoo.co.uk",
    job: "Ιδιωτ. Υπαλληλος",
    age: "31-45"
  },
  {
    gender: "Κος",
    firstname: "Νικος",
    lastname: "Δελλης",
    address: "Κωστη Παλαμα 10",
    city: "Ραφηνα",
    postal: "19009",
    phone: "6974789122",
    email: "nikocdelic@hotmail.com",
    job: "Ιδιωτ. Υπαλληλος",
    age: "31-45"
  },
  {
    gender: "Κος",
    firstname: "Σαραντος",
    lastname: "Τζορτζης",
    address: "Φλεμιγκ 28",
    city: "Ραφηνα",
    postal: "19009",
    phone: "6971502610",
    email: "sarantos_tzortzis@icloud.com",
    job: "Ιδιωτ. Υπαλληλος",
    age: "31-45"
  },
  {
    gender: "Κος",
    firstname: "Χρήστος",
    lastname: "Ραμαντάνης",
    address: "Θεοπομπου 180",
    city: "Πετραλωνα",
    postal: "11851",
    phone: "6943021425",
    email: "christos.ramantanis@gmail.com",
    job: "Ιδιωτ. Υπαλληλος",
    age: "31-45"
  },
  {
    gender: "Κα",
    firstname: "Σοφια",
    lastname: "Κοσεογλου",
    address: "Δοιρανης 11",
    city: "Αθήνα",
    postal: "60100",
    phone: "6981229431",
    email: "sofaki_092@hotmail.com",
    job: "Ιδιωτ. Υπαλληλος",
    age: "19-30"
  },
  {
    gender: "Κα",
    firstname: "Αθηνα",
    lastname: "Τσεντιδου",
    address: "Δοιρανης 11",
    city: "Αθηνα",
    postal: "60100",
    phone: "6944640703",
    email: "tsoptsop95@gmail.com",
    job: "Ιδιωτ. Υπαλληλος",
    age: "19-30"
  },
  {
      gender: "Κα",
      firstname: "Κωνσταντίνα",
      lastname: "Μαγκαφά",
      address: "Αριστείδου 171",
      city: "Αθήνα",
      postal: "17672",
      phone: "6987958590",
      email: "kmagafa92@gmail.com",
      job: "Ιδιωτ. Υπαλληλος",
      age: "31-45"
  },
  {
      gender: "Κα",
      firstname: "αθηνα",
      lastname: "φλεγκα",
      address: "Αγιου Φανουριου 69",
      city: "ραφηνα",
      postal: "19009",
      phone: "6937650533",
      email: "athinarta@yahoo.gr",
      job: "Δημ. Υπαλληλος",
      age: "46+"
  },
  {
      gender: "Κος",
      firstname: "ιωαννης",
      lastname: "τσοπελας",
      address: "Αγιου Φανουριου 69",
      city: "ραφηνα",
      postal: "19009",
      phone: "6932806827",
      email: "juantsopelas56@gmail.com",
      job: "Δημ. Υπαλληλος",
      age: "46+"
  },
  {
    gender: "Κος",
    firstname: "Γιωργος",
    lastname: "Ανδρεου",
    address: "Ιθακης 30",
    city: "Αθήνα",
    postal: "18120",
    phone: "6983405545",
    email: "gandreou9991@gmail.com",
    job: "Ιδιωτ. Υπαλληλος",
    age: "31-45"
  },
  {
    gender: "Κα",
    firstname: "Δομνα",
    lastname: "Παντελιδου",
    address: "Ιθακης 30",
    city: "Αθήνα",
    postal: "18120",
    phone: "6980903334",
    email: "ddomna2@gmail.com",
    job: "Ιδιωτ. Υπαλληλος",
    age: "19-30"
  }
];

// TODO use true to avoid duplicates
const idsAndDates = await getIdsAndDates(false);

processRequests(idsAndDates, users);

