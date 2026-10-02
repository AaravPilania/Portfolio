# Contact page research — v5 (Oct 2026)

Sources read with web search/fetch (several studio sites are JS-rendered, so fetched text is partial; notes say so).

| Site | URL | What the contact moment does |
| --- | --- | --- |
| Awwwards — Contact Page collection | https://www.awwwards.com/websites/contact-page/ | 2026 honourees (Pensatori Irrazionali SOTD Jun 2026, Studio Namma SOTD + Dev May 2026, YUNGBLD, Charmer Studio, jungheonlee HM). Contact is judged as its own element: big type, one action, motion as reward, not a form wall. |
| Awwwards — Portfolio collection | https://www.awwwards.com/websites/portfolio/ | Current portfolio honourees (G. Colombel 2026, Krasimir Stoimenov '26, Alejandro HA, Guillaume Zhu…) cluster around 2-colour palettes and a single contact line in the footer/aside. |
| Studio Namma (SOTD) | https://www.awwwards.com/sites/studio-namma | Highlights listed by Awwwards: "Contact Form" and "Footer Design" as featured elements; palette is just #111111 / #E4E4E4 — contact carried by type and motion, not colour. |
| Portfolio 25' — Eliza Doltu (HM) | https://www.awwwards.com/sites/portfolio-25 | Contact is a featured element; 2-colour palette (#E2E1DF / #131313). |
| Jungheon Lee portfolio (HM) | https://www.awwwards.com/sites/jungheon-lee-portfolio | Contact featured; pure #000 / #FFF. |
| Hon Tran — creative developer (Awwwards jury, 9× SOTD) | https://www.hontran.dev/ · https://www.hontran.dev/hire | Email repeated as plain text at top and bottom; city + timezone stated ("Ho Chi Minh City… working hours that overlap European mornings"); "I read every message myself". |
| Dennis Snellenberg (multiple SOTD) | https://dennissnellenberg.com/contact | Contact page is two short lists: contact details (email, phone) and business details incl. location. Homepage repeats the email as the main CTA. Its footer is widely referenced for a big "Let's work together", a magnetic button and a local-time readout (prior knowledge, not confirmed this session: the fetch returned text only). |
| Lusion (studio, many SOTD/SOTY) | https://lusion.co/contact | Ends on one provocative question headline ("Is Your Big Idea Ready to Go Wild?") then two emails and an address — nothing else. |
| Cuberto | https://cuberto.com/contacts/ | Conversational headline ("Hey! Tell us all the things"), interest chips, with the raw email as fallback even inside the form error message. |
| Locomotive | https://locomotive.ca/en/contact | Title is just "Let's talk" (page body is JS-rendered; text fetch empty). |

## Takeaways applied

1. **One headline, one action.** Lusion, Snellenberg and Locomotive end on a single imperative line, then the email. → Brier headline "Book a slot." with one yellow CTA that opens a pre-addressed mailto; nothing competes with it.
2. **The raw email is always visible and copyable.** Hon Tran and Cuberto show the address as text even where there is a form. → Address shown in mono with a Copy button (clipboard + aria-live confirmation, select-text fallback).
3. **Place and time make a person feel reachable.** Hon Tran states city and timezone overlap (and Snellenberg's footer reportedly shows local time). → Live New Delhi clock (IST, GMT+5:30) with a light status line ("probably awake"), and a real "now" line on today's column of the calendar.
4. **Two colours, big type, motion as the reward.** The honoured contact pages above run on 2-colour palettes and let type and motion do the work. → Void panel + signature yellow grid only; the dancer stays the hero and the contact layer is static type.
5. **Integrate with the concept instead of bolting on a footer.** → The panel is the calendar's own sidebar: "Create" becomes "Book a slot", the mini month marks today and the week on screen, "My calendars" is the grid's legend (Free time / Busy rn), and "Other calendars" holds GitHub and the portfolio link.

## Real contact data used

- Email: `aaravpilania2006@gmail.com` — Aarav Pilania's commit identity in this repo (`git log`, recorded in `final/gitlog.txt`).
- GitHub: https://github.com/AaravPilania (given in the brief).
- Location/time zone: New Delhi, IST (given in the brief).
- Not found anywhere in the repo, so omitted: LinkedIn, Instagram/X, résumé PDF, phone (phone omitted by rule).
