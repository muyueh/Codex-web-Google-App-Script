function createLiMuYueSlides() {
  const presentation = SlidesApp.create('李慕約三頁簡報');
  const [titleSlide] = presentation.getSlides();

  setShapeText(titleSlide, SlidesApp.PlaceholderType.CENTERED_TITLE, '李慕約 Li Mu Yue');
  setShapeText(
    titleSlide,
    SlidesApp.PlaceholderType.SUBTITLE,
    '跨領域講者、策展顧問與華語教育推廣者'
  );

  const slidesData = [
    {
      title: '成長背景與信念',
      bullets: [
        '南投長大、台北求學，擅長把中部的人情故事帶進城市講座。',
        '政治與文史雙主修，習慣用史料佐證觀點並附上延伸閱讀。',
        '長期投入青少年公共議題，提倡「用故事讓價值被看見」。'
      ]
    },
    {
      title: '代表作品與影響力',
      bullets: [
        '《霧城散步》系列演講：用地方記憶帶領聽眾重新認識霧峰與中興新村。',
        '成立「暮光策展」團隊，設計學校與社區共學展覽，培養學生的口說與採訪力。',
        '合作品牌包含誠品、文化部及多個社創空間，常以 podcast 與直播分享策展幕後。'
      ]
    }
  ];

  slidesData.forEach(section => {
    const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.TITLE_AND_BODY);
    setShapeText(slide, SlidesApp.PlaceholderType.TITLE, section.title);
    const bodyShape = setShapeText(slide, SlidesApp.PlaceholderType.BODY, section.bullets.join('\n'));
    if (bodyShape) {
      // 依 docs/AGENTS-reference-gas.md §7 的檢查流程先確認 Slides ListPreset enum 名稱，再挑選要套用的樣式。
      bodyShape.getText().getListStyle().applyListPreset(SlidesApp.ListPreset.DISC_CIRCLE_SQUARE);
    }
  });

  Logger.log('Created Li Mu Yue deck: %s', presentation.getUrl());
  return presentation.getUrl();
}

function setShapeText(slide, placeholderType, text) {
  const element = slide.getPlaceholder(placeholderType);
  if (!element) {
    return null;
  }

  const isShape = [SlidesApp.PageElementType.SHAPE, SlidesApp.PageElementType.PLACEHOLDER].includes(
    element.getPageElementType()
  );
  if (!isShape) {
    return null;
  }

  let shape;
  try {
    shape = element.asShape();
  } catch (error) {
    Logger.log('Placeholder %s is not a shape: %s', placeholderType, error);
    return null;
  }

  shape.getText().setText(text);
  return shape;
}
