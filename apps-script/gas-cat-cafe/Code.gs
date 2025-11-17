function createCatCafeShowcase() {
  const deck = SlidesApp.create('Meow Cat Café Three-Page Story');
  const [openingSlide] = deck.getSlides();
  const hero = {
    title: 'Meow Cat Café',
    subtitle: 'Three cozy pages of latte art, whiskers, and adoption love'
  };
  setShapeText(openingSlide, SlidesApp.PlaceholderType.CENTERED_TITLE, hero.title);
  setShapeText(openingSlide, SlidesApp.PlaceholderType.SUBTITLE, hero.subtitle);

  const sections = getCatCafeSections();
  sections.forEach(section => {
    const slide = deck.appendSlide(SlidesApp.PredefinedLayout.TITLE_AND_BODY);
    setShapeText(slide, SlidesApp.PlaceholderType.TITLE, section.title);
    const bodyText = formatBulletList(section.body);
    setShapeText(slide, SlidesApp.PlaceholderType.BODY, bodyText);
  });

  const slidesToKeep = 3;
  while (deck.getSlides().length > slidesToKeep) {
    deck.getSlides()[deck.getSlides().length - 1].remove();
  }

  Logger.log('Created cat café showcase: %s', deck.getUrl());
  return deck.getUrl();
}

function getCatCafeSections() {
  return [
    {
      title: 'Slow mornings with feline company',
      body: [
        'Sunrise pour-over bar with Ethiopian beans and oat milk foam hearts.',
        'Reservation-friendly window seats where shy cats lounge on rattan shelves.'
      ]
    },
    {
      title: 'Signature treats & adoption corner',
      body: [
        'Paw-print macarons, tuna crumble quiche, and nitro cold brew flights.',
        'Weekly meet-and-greet for adoptable rescues with QR codes for applications.'
      ]
    }
  ];
}

function formatBulletList(lines) {
  return lines.map(line => `• ${line}`).join('\n');
}

function setShapeText(slide, placeholderType, text) {
  const element = slide.getPlaceholder(placeholderType);
  if (!element) {
    return null;
  }

  const elementType = element.getPageElementType();
  const canCast =
    elementType === SlidesApp.PageElementType.SHAPE || elementType === SlidesApp.PageElementType.PLACEHOLDER;
  if (!canCast) {
    return null;
  }

  let shape;
  try {
    shape = element.asShape();
  } catch (error) {
    Logger.log('Unable to cast placeholder %s: %s', placeholderType, error);
    return null;
  }

  shape.getText().setText(text);
  return shape;
}
