import {
  importContacts,
  type ContactImportRow,
} from "services/contactImportService";
import { oauthConfig } from "config/oauth.config";

// Helper function to decode HTML entities and clean text
function cleanText(text: string): string {
  if (!text) return text;

  // Remove HTML entities for common characters
  const cleaned = text
    .replace(/&#13;/g, "") // Carriage return
    .replace(/&#10;/g, "") // Line feed
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\r/g, "") // Remove actual carriage returns
    .replace(/\n/g, "") // Remove line feeds
    .trim();

  return cleaned;
}

// Parse vCard data to extract contact information
function parseVCard(vcard: string) {
  const lines = vcard.split(/\r?\n/);
  const contact: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    title?: string;
    city?: string;
    state?: string;
    country?: string;
    photoUrl?: string;
  } = {};

  for (const line of lines) {
    // Clean the line by removing carriage returns and trimming
    const cleanLine = line.replace(/\r/g, "").trim();

    // Handle FN (Full Name)
    if (cleanLine.startsWith("FN:")) {
      contact.name = cleanText(cleanLine.substring(3));
    }
    // Handle EMAIL (various formats: EMAIL;type=INTERNET:, EMAIL:, etc.)
    else if (cleanLine.startsWith("EMAIL")) {
      const emailMatch = cleanLine.match(/:(.*)/);
      if (emailMatch && emailMatch[1].trim()) {
        contact.email = cleanText(emailMatch[1]);
      }
    }
    // Handle TEL (various formats: TEL;type=CELL:, TEL:, etc.)
    else if (cleanLine.startsWith("TEL")) {
      const telMatch = cleanLine.match(/:(.*)/);
      if (telMatch && telMatch[1].trim()) {
        contact.phone = cleanText(telMatch[1]);
      }
    }
    // Handle ORG (Organization/Company)
    else if (cleanLine.startsWith("ORG:")) {
      const [company] = cleanLine.substring(4).split(";");
      contact.company = cleanText(company);
    }
    // Handle TITLE (Job Title)
    else if (cleanLine.startsWith("TITLE:")) {
      contact.title = cleanText(cleanLine.substring(6));
    }
    // Handle ADR (Address) - format: ADR;type=HOME:;;street;city;state;zip;country
    else if (cleanLine.startsWith("ADR")) {
      const adrMatch = cleanLine.match(/:(.*)/);
      if (adrMatch) {
        const [, adrValue] = adrMatch;
        const parts = adrValue.split(";");
        if (parts.length >= 7) {
          const [, , , city, state, , country] = parts;
          contact.city = cleanText(city) || undefined;
          contact.state = cleanText(state) || undefined;
          contact.country = cleanText(country) || undefined;
        }
      }
    }
    // Handle PHOTO - only if it's a URL (skip base64 encoded photos)
    else if (
      (cleanLine.startsWith("PHOTO") && cleanLine.includes("VALUE=URI")) ||
      cleanLine.includes("VALUE=uri")
    ) {
      const photoMatch = cleanLine.match(/:(https?:\/\/[^\s]+)/i);
      if (photoMatch) {
        const [, photoUrl] = photoMatch;
        contact.photoUrl = photoUrl;
      }
    }
  }

  return contact;
}

// Fetch contacts from iCloud using CardDAV protocol
export async function fetchiCloudContacts(
  appleId: string,
  appPassword: string
) {
  const credentials = Buffer.from(`${appleId}:${appPassword}`).toString(
    "base64"
  );
  const baseUrl = oauthConfig.apple.contactsBaseUrl;

  // Step 1: Discover principal URL
  const principalResponse = await fetch(`${baseUrl}/`, {
    method: "PROPFIND",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/xml; charset=utf-8",
      Depth: "0",
    },
    body: `<?xml version="1.0" encoding="UTF-8"?>
      <d:propfind xmlns:d="DAV:">
        <d:prop>
          <d:current-user-principal />
        </d:prop>
      </d:propfind>`,
  });

  if (!principalResponse.ok) {
    throw new Error(
      `Failed to authenticate with iCloud (Status: ${principalResponse.status}). Please verify your Apple ID and app-specific password. Make sure you're using an app-specific password from https://appleid.apple.com/account/manage`
    );
  }

  const principalText = await principalResponse.text();

  // Look specifically for href inside current-user-principal tag
  const principalMatch = principalText.match(
    /<(?:d:)?current-user-principal[^>]*>[\s\S]*?<(?:d:)?href[^>]*>([^<]+)<\/(?:d:)?href>/
  );
  if (!principalMatch) {
    throw new Error("Could not find principal URL");
  }

  const [, principalPath] = principalMatch;
  const principalUrl = `${baseUrl}${principalPath}`;

  // Step 2: Find address book home
  const addressBookHomeResponse = await fetch(principalUrl, {
    method: "PROPFIND",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/xml; charset=utf-8",
      Depth: "0",
    },
    body: `<?xml version="1.0" encoding="UTF-8"?>
      <d:propfind xmlns:d="DAV:" xmlns:card="urn:ietf:params:xml:ns:carddav">
        <d:prop>
          <card:addressbook-home-set />
        </d:prop>
      </d:propfind>`,
  });

  const addressBookHomeText = await addressBookHomeResponse.text();

  // Look specifically for href inside addressbook-home-set tag
  const addressBookMatch = addressBookHomeText.match(
    /<(?:card:)?addressbook-home-set[^>]*>[\s\S]*?<(?:d:)?href[^>]*>([^<]+)<\/(?:d:)?href>/
  );
  if (!addressBookMatch) {
    throw new Error("Could not find address book home");
  }

  const [, addressBookPath] = addressBookMatch;
  const homeUrl = addressBookPath.startsWith("https")
    ? addressBookPath
    : `${baseUrl}${addressBookPath}`;

  // Step 3: Get address books and find CardDAV collection
  const addressBooksResponse = await fetch(homeUrl, {
    method: "PROPFIND",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/xml; charset=utf-8",
      Depth: "1",
    },
    body: `<?xml version="1.0" encoding="UTF-8"?>
      <d:propfind xmlns:d="DAV:">
        <d:prop>
          <d:resourcetype />
        </d:prop>
      </d:propfind>`,
  });

  const addressBooksText = await addressBooksResponse.text();

  // Find the card collection URL (specifically looking for "carddavhome/card/")
  let cardCollectionPath = null;
  const hrefMatches = addressBooksText.matchAll(
    /<(?:d:)?href[^>]*>([^<]+)<\/(?:d:)?href>/g
  );

  for (const match of hrefMatches) {
    const [, href] = match;
    if (href.includes("carddavhome/card/")) {
      cardCollectionPath = href;
      break;
    }
  }

  if (!cardCollectionPath) {
    throw new Error("Could not find card collection!");
  }

  const addressBookUrl = cardCollectionPath.startsWith("https")
    ? cardCollectionPath
    : `${baseUrl}${cardCollectionPath}`;

  // Step 4: Fetch contacts using CardDAV REPORT
  const contactsResponse = await fetch(addressBookUrl, {
    method: "REPORT",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/xml",
      Depth: "1",
    },
    body: `<?xml version="1.0" encoding="UTF-8"?>
      <card:addressbook-query xmlns:d="DAV:" xmlns:card="urn:ietf:params:xml:ns:carddav">
        <d:prop>
          <d:getetag />
          <card:address-data />
        </d:prop>
      </card:addressbook-query>`,
  });

  if (!contactsResponse.ok) {
    throw new Error(
      `Failed to fetch contacts: ${contactsResponse.status} ${contactsResponse.statusText}`
    );
  }

  const contactsText = await contactsResponse.text();

  // Extract vCards from XML response
  const vcardMatches = contactsText.matchAll(/BEGIN:VCARD([\s\S]*?)END:VCARD/g);
  const contacts = [];

  for (const match of vcardMatches) {
    const vcard = `BEGIN:VCARD${match[1]}END:VCARD`;
    try {
      const parsed = parseVCard(vcard);
      if (parsed.name || parsed.email || parsed.phone) {
        contacts.push({
          ...parsed,
          raw_vcard: vcard,
        });
      }
    } catch {
      // Skip invalid vCard entries
    }
  }

  return contacts;
}

export async function importAppleContacts(
  appleId: string,
  appPassword: string,
  userId: string
) {
  // Fetch real contacts from iCloud using CardDAV
  const iCloudContacts = await fetchiCloudContacts(appleId, appPassword);

  // Transform iCloud contacts to ContactImportRow format
  const contactRows: ContactImportRow[] = iCloudContacts
    .map((contact) => {
      // Skip contacts without email or phone (require at least one identifier)
      if (!contact.email && !contact.phone) {
        return null;
      }

      // Split name into first and last name and clean thoroughly
      const nameParts = cleanText(contact.name || "")
        .split(" ")
        .filter((part) => part.trim());
      const [firstNamePart, ...lastNameParts] = nameParts;
      const firstName = cleanText(firstNamePart || "");
      const lastName = cleanText(lastNameParts.join(" "));

      // Require first_name (derived from name)
      if (!firstName) {
        return null;
      }

      const email = cleanText(contact.email || "");
      const phoneNumber = cleanText(contact.phone || "");

      return {
        first_name: firstName,
        last_name: lastName,
        email: email || undefined,
        phone_number: phoneNumber || undefined,
        company: contact.company || undefined,
        title: contact.title || undefined,
        city: contact.city || undefined,
        state: contact.state || undefined,
        country: contact.country || undefined,
        profile_photo_url: contact.photoUrl || undefined,
      };
    })
    .filter(
      (contact): contact is NonNullable<typeof contact> => contact !== null
    );

  // Use the shared importContacts service (same as Google contacts)
  const result = await importContacts(contactRows, {
    userId,
    source: "Apple",
    batchSize: 50,
    allowUpdates: true,
  });

  return {
    success: true,
    count: result.imported + result.updated,
    imported: result.imported,
    updated: result.updated,
    message: `Successfully processed ${result.imported + result.updated} contacts (${result.imported} new, ${result.updated} updated)`,
  };
}
