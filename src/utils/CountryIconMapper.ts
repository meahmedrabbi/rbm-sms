/**
 * CountryIconMapper - Smart country icon mapping utility
 * Maps country names to appropriate flag emojis and icons
 */

export class CountryIconMapper {
  private static readonly COUNTRY_ICONS: Record<string, string> = {
    // Major countries with flag emojis
    'AFGHANISTAN': '🇦🇫',
    'ALBANIA': '🇦🇱',
    'ALGERIA': '🇩🇿',
    'ANDORRA': '🇦🇩',
    'ANGOLA': '🇦🇴',
    'ARGENTINA': '🇦🇷',
    'ARMENIA': '🇦🇲',
    'AUSTRALIA': '🇦🇺',
    'AUSTRIA': '🇦🇹',
    'AZERBAIJAN': '🇦🇿',
    'BAHRAIN': '🇧🇭',
    'BANGLADESH': '🇧🇩',
    'BELARUS': '🇧🇾',
    'BELGIUM': '🇧🇪',
    'BENIN': '🇧🇯',
    'BOLIVIA': '🇧🇴',
    'BOSNIA AND HERZEGOVINA': '🇧🇦',
    'BOTSWANA': '🇧🇼',
    'BRAZIL': '🇧🇷',
    'BRUNEI': '🇧🇳',
    'BULGARIA': '🇧🇬',
    'BURKINA FASO': '🇧🇫',
    'BURUNDI': '🇧🇮',
    'CAMBODIA': '🇰🇭',
    'CAMEROON': '🇨🇲',
    'CANADA': '🇨🇦',
    'CAPE VERDE': '🇨🇻',
    'CHAD': '🇹🇩',
    'CHILE': '🇨🇱',
    'CHINA': '🇨🇳',
    'COLOMBIA': '🇨🇴',
    'COMOROS': '🇰🇲',
    'CONGO': '🇨🇬',
    'COSTA RICA': '🇨🇷',
    'CROATIA': '🇭🇷',
    'CUBA': '🇨🇺',
    'CYPRUS': '🇨🇾',
    'CZECH REPUBLIC': '🇨🇿',
    'DENMARK': '🇩🇰',
    'DJIBOUTI': '🇩🇯',
    'DOMINICAN REPUBLIC': '🇩🇴',
    'ECUADOR': '🇪🇨',
    'EGYPT': '🇪🇬',
    'EL SALVADOR': '🇸🇻',
    'ESTONIA': '🇪🇪',
    'ETHIOPIA': '🇪🇹',
    'FINLAND': '🇫🇮',
    'FRANCE': '🇫🇷',
    'GABON': '🇬🇦',
    'GAMBIA': '🇬🇲',
    'GEORGIA': '🇬🇪',
    'GERMANY': '🇩🇪',
    'GHANA': '🇬🇭',
    'GREECE': '🇬🇷',
    'GUATEMALA': '🇬🇹',
    'GUINEA': '🇬🇳',
    'GUINEA-BISSAU': '🇬🇼',
    'GUYANA': '🇬🇾',
    'HAITI': '🇭🇹',
    'HONDURAS': '🇭🇳',
    'HONG KONG': '🇭🇰',
    'HUNGARY': '🇭🇺',
    'ICELAND': '🇮🇸',
    'INDIA': '🇮🇳',
    'INDONESIA': '🇮🇩',
    'IRAN': '🇮🇷',
    'IRAQ': '🇮🇶',
    'IRELAND': '🇮🇪',
    'ISRAEL': '🇮🇱',
    'ITALY': '🇮🇹',
    'IVORY COAST': '🇨🇮',
    'JAMAICA': '🇯🇲',
    'JAPAN': '🇯🇵',
    'JORDAN': '🇯🇴',
    'KAZAKHSTAN': '🇰🇿',
    'KENYA': '🇰🇪',
    'KUWAIT': '🇰🇼',
    'KYRGYZSTAN': '🇰🇬',
    'LAOS': '🇱🇦',
    'LATVIA': '🇱🇻',
    'LEBANON': '🇱🇧',
    'LESOTHO': '🇱🇸',
    'LIBERIA': '🇱🇷',
    'LIBYA': '🇱🇾',
    'LITHUANIA': '🇱🇹',
    'LUXEMBOURG': '🇱🇺',
    'MADAGASCAR': '🇲🇬',
    'MALAWI': '🇲🇼',
    'MALAYSIA': '🇲🇾',
    'MALDIVES': '🇲🇻',
    'MALI': '🇲🇱',
    'MALTA': '🇲🇹',
    'MAURITANIA': '🇲🇷',
    'MAURITIUS': '🇲🇺',
    'MEXICO': '🇲🇽',
    'MOLDOVA': '🇲🇩',
    'MONACO': '🇲🇨',
    'MONGOLIA': '🇲🇳',
    'MONTENEGRO': '🇲🇪',
    'MOROCCO': '🇲🇦',
    'MOZAMBIQUE': '🇲🇿',
    'MYANMAR': '🇲🇲',
    'NAMIBIA': '🇳🇦',
    'NEPAL': '🇳🇵',
    'NETHERLANDS': '🇳🇱',
    'NEW ZEALAND': '🇳🇿',
    'NICARAGUA': '🇳🇮',
    'NIGER': '🇳🇪',
    'NIGERIA': '🇳🇬',
    'NORTH KOREA': '🇰🇵',
    'NORTH MACEDONIA': '🇲🇰',
    'NORWAY': '🇳🇴',
    'OMAN': '🇴🇲',
    'PAKISTAN': '🇵🇰',
    'PANAMA': '🇵🇦',
    'PAPUA NEW GUINEA': '🇵🇬',
    'PARAGUAY': '🇵🇾',
    'PERU': '🇵🇪',
    'PHILIPPINES': '🇵🇭',
    'POLAND': '🇵🇱',
    'PORTUGAL': '🇵🇹',
    'QATAR': '🇶🇦',
    'ROMANIA': '🇷🇴',
    'RUSSIA': '🇷🇺',
    'RWANDA': '🇷🇼',
    'SAUDI ARABIA': '🇸🇦',
    'SENEGAL': '🇸🇳',
    'SERBIA': '🇷🇸',
    'SEYCHELLES': '🇸🇨',
    'SIERRA LEONE': '🇸🇱',
    'SINGAPORE': '🇸🇬',
    'SLOVAKIA': '🇸🇰',
    'SLOVENIA': '🇸🇮',
    'SOMALIA': '🇸🇴',
    'SOUTH AFRICA': '🇿🇦',
    'SOUTH KOREA': '🇰🇷',
    'SOUTH SUDAN': '🇸🇸',
    'SPAIN': '🇪🇸',
    'SRI LANKA': '🇱🇰',
    'SUDAN': '🇸🇩',
    'SURINAME': '🇸🇷',
    'SWEDEN': '🇸🇪',
    'SWITZERLAND': '🇨🇭',
    'SYRIA': '🇸🇾',
    'TAIWAN': '🇹🇼',
    'TAJIKISTAN': '🇹🇯',
    'TANZANIA': '🇹🇿',
    'THAILAND': '🇹🇭',
    'TOGO': '🇹🇬',
    'TRINIDAD AND TOBAGO': '🇹🇹',
    'TUNISIA': '🇹🇳',
    'TURKEY': '🇹🇷',
    'TURKMENISTAN': '🇹🇲',
    'UGANDA': '🇺🇬',
    'UKRAINE': '🇺🇦',
    'UNITED ARAB EMIRATES': '🇦🇪',
    'UNITED KINGDOM': '🇬🇧',
    'UNITED STATES': '🇺🇸',
    'URUGUAY': '🇺🇾',
    'UZBEKISTAN': '🇺🇿',
    'VENEZUELA': '🇻🇪',
    'VIETNAM': '🇻🇳',
    'YEMEN': '🇾🇪',
    'ZAMBIA': '🇿🇲',
    'ZIMBABWE': '🇿🇼',

    // Common alternative names
    'USA': '🇺🇸',
    'UK': '🇬🇧',
    'UAE': '🇦🇪',
    'CZECH': '🇨🇿',
    'BOSNIA': '🇧🇦',
    'MACEDONIA': '🇲🇰'
  };

  /**
   * Get country icon for a given country name
   * Returns flag emoji if available, otherwise a generic globe icon
   */
  public static getCountryIcon(countryName: string): string {
    if (!countryName) return '🌍';
    
    const normalizedName = countryName.toUpperCase().trim();
    
    // Direct match
    if (this.COUNTRY_ICONS[normalizedName]) {
      return this.COUNTRY_ICONS[normalizedName];
    }

    // Try partial matches for compound names
    for (const [key, icon] of Object.entries(this.COUNTRY_ICONS)) {
      if (normalizedName.includes(key) || key.includes(normalizedName)) {
        return icon;
      }
    }

    // Special cases for common variations
    if (normalizedName.includes('UNITED STATES') || normalizedName.includes('US') || normalizedName.includes('USA')) {
      return '🇺🇸';
    }
    if (normalizedName.includes('UNITED KINGDOM') || normalizedName.includes('UK') || normalizedName.includes('BRITAIN')) {
      return '🇬🇧';
    }
    if (normalizedName.includes('KOREA') && normalizedName.includes('SOUTH')) {
      return '🇰🇷';
    }
    if (normalizedName.includes('KOREA') && normalizedName.includes('NORTH')) {
      return '🇰🇵';
    }

    // Default to globe icon
    return '🌍';
  }

  /**
   * Get formatted country display name with icon
   */
  public static getFormattedCountryName(countryName: string): string {
    const icon = this.getCountryIcon(countryName);
    return `${icon} ${countryName}`;
  }

  /**
   * Get compact country display for buttons (shorter format)
   */
  public static getCompactCountryName(countryName: string): string {
    const icon = this.getCountryIcon(countryName);
    
    // Shorten very long names for better button display
    let displayName = countryName;
    if (displayName.length > 15) {
      // Common abbreviations
      displayName = displayName
        .replace('UNITED STATES', 'USA')
        .replace('UNITED KINGDOM', 'UK')
        .replace('UNITED ARAB EMIRATES', 'UAE')
        .replace('BOSNIA AND HERZEGOVINA', 'BOSNIA')
        .replace('TRINIDAD AND TOBAGO', 'TRINIDAD')
        .replace('SAUDI ARABIA', 'SAUDI')
        .replace('SOUTH AFRICA', 'S.AFRICA')
        .replace('NEW ZEALAND', 'N.ZEALAND')
        .replace('PAPUA NEW GUINEA', 'PAPUA')
        .replace('NORTH MACEDONIA', 'N.MACEDONIA');
      
      // If still too long, truncate
      if (displayName.length > 15) {
        displayName = displayName.substring(0, 12) + '...';
      }
    }
    
    return `${icon} ${displayName}`;
  }
}
