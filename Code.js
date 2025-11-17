function helloWorld() {
  Logger.log('Hello from single-repo GAS + GitHub Actions!');
}

function createTaipeiCoffeeShopSlides() {
  const presentation = SlidesApp.create('Taipei Coffee Shop Highlights');
  const [titleSlide] = presentation.getSlides();

  setShapeText(titleSlide, SlidesApp.PlaceholderType.CENTERED_TITLE, 'Coffee Shop Hopping in Taipei');
  setShapeText(
    titleSlide,
    SlidesApp.PlaceholderType.SUBTITLE,
    'Curated mini-guide for remote work, pour overs, and late night chats'
  );

  const sections = [
    {
      title: 'Why Taipei coffee culture shines',
      bullets: [
        'Specialty roasters mix Scandinavian light roasts with Japanese kissaten rituals.',
        'Third-wave cafés stay open late, turning pour-over bars into creative studios.',
        'Friendly baristas blend Mandarin, English, and latte art tips for travelers.'
      ]
    },
    {
      title: 'Neighborhood vibes to explore',
      bullets: [
        'Zhongshan: slow mornings, Nordic interiors, and photogenic desserts.',
        'Da’an: students and founders swapping ideas over natural-process beans.',
        'Dongmen & Yongkang: laneway espresso bars hiding next to soup-dumpling icons.'
      ]
    },
    {
      title: 'Signature experiences',
      bullets: [
        'Taste championship-level brews at Fika Fika and Simple Kaffa.',
        'Join a hand-drip class at GK Coffee or Rufous Roastery.',
        'Cool down with brown sugar lattes and pineapple cakes in Jiufen-style teahouse cafés.'
      ]
    },
    {
      title: 'Remote-work friendly picks',
      bullets: [
        'W2 Wood Works: spacious tables, mellow vinyl playlist, generous outlets.',
        'Woolloomooloo: Aussie brunch with reliable Wi-Fi near Taipei 101.',
        'Coffee Lab: nitrogen cold brew on tap plus quiet second-floor desks.'
      ]
    },
    {
      title: 'Evening coffee crawl ideas',
      bullets: [
        'Hit % Arabica in Xinyi for a golden-hour latte with skyline views.',
        'Shift to specialty cocktails at MUD Coffee & Roaster after 8 PM.',
        'Wrap the night with a sesame affogato at Tamed Fox.'
      ]
    }
  ];

  sections.forEach(section => {
    const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.TITLE_AND_BODY);
    setShapeText(slide, SlidesApp.PlaceholderType.TITLE, section.title);
    const bodyShape = setShapeText(slide, SlidesApp.PlaceholderType.BODY, section.bullets.join('\n'));
    if (bodyShape) {
      bodyShape.getText().getListStyle().applyListPreset(SlidesApp.ListPreset.BULLET_DISC_CIRCLE_SQUARE);
    }
  });

  const closingSlide = presentation.appendSlide(SlidesApp.PredefinedLayout.SECTION_HEADER);
  setShapeText(closingSlide, SlidesApp.PlaceholderType.TITLE, 'Plan your Taipei café day');
  setShapeText(
    closingSlide,
    SlidesApp.PlaceholderType.BODY,
    'Bookmark favorite spots, reserve cupping classes, and share the deck with travel buddies.'
  );

  Logger.log('Created Slides deck at %s', presentation.getUrl());
  return presentation.getUrl();
}

function setShapeText(slide, placeholderType, text) {
  const element = slide.getPlaceholder(placeholderType);
  if (!element) {
    return null;
  }

  const elementType = element.getPageElementType();
  const supportsShapeCasting =
    elementType === SlidesApp.PageElementType.SHAPE || elementType === SlidesApp.PageElementType.PLACEHOLDER;

  if (!supportsShapeCasting) {
    return null;
  }

  let shape;
  try {
    shape = element.asShape();
  } catch (error) {
    Logger.log('Unable to cast placeholder %s to shape: %s', placeholderType, error);
    return null;
  }

  shape.getText().setText(text);
  return shape;
}
