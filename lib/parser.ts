// 상품명에서 코스 추출
export function extractCourse(productName: string): string {
  if (productName.includes('하프') || productName.includes('Half')) return 'Half'
  if (productName.includes('10K')) return '10K'
  if (productName.includes('5K')) return '5K'
  return ''
}

// 옵션명에서 정보 파싱
export interface ParsedOption {
  phone: string
  emergencyContact: string
  emergencyRelation: string
  birthDate: string
  tshirtSize: string
  gender: string
}

export function parseOptionString(optionRaw: string): ParsedOption {
  const result: ParsedOption = {
    phone: '',
    emergencyContact: '',
    emergencyRelation: '',
    birthDate: '',
    tshirtSize: '',
    gender: ''
  }

  if (!optionRaw) return result

  // 연락처 파싱 - 여러 패턴 시도
  const phonePatterns = [
    /연락처\s*\([^)]*\)\s*:\s*([\d\-]+)/,
    /연락처\s*:\s*([\d\-]+)/
  ]
  for (const pattern of phonePatterns) {
    const match = optionRaw.match(pattern)
    if (match) {
      result.phone = match[1].replace(/-/g, '')
      break
    }
  }

  // 비상연락처 파싱 - 영문 포함 패턴 추가
  const emergencyPatterns = [
    /비상연락처\s*Emergency[^:]*:\s*([\d\-]+)/i,
    /비상연락처\s*\/?\s*관계[^:]*:\s*([\d\-]+)\s*\/\s*([^\s/]+)/,
    /비상연락처[^:]*:\s*([\d\-]+)/,
  ]

  for (const pattern of emergencyPatterns) {
    const match = optionRaw.match(pattern)
    if (match) {
      result.emergencyContact = match[1].replace(/-/g, '')
      if (match[2]) {
        result.emergencyRelation = match[2].trim()
      }
      break
    }
  }

  // 관계 파싱 - 영문 포함 패턴 추가
  if (!result.emergencyRelation) {
    const relationPatterns = [
      /비상연락처\s*관계\s*Relationship[^:]*:\s*([^\s/]+)/i,
      /관계[^:]*:\s*([^\s/]+)/
    ]
    for (const pattern of relationPatterns) {
      const match = optionRaw.match(pattern)
      if (match) {
        result.emergencyRelation = match[1].trim()
        break
      }
    }
  }

  // 생년월일 파싱
  const birthPatterns = [
    /생년월일\s*\([^)]*\)\s*:\s*(\d{6,8})/,
    /생년월일\s*:\s*(\d{6,8})/
  ]
  for (const pattern of birthPatterns) {
    const match = optionRaw.match(pattern)
    if (match) {
      result.birthDate = match[1]
      break
    }
  }

  // 티셔츠 사이즈 파싱 - 영문 포함 패턴 추가
  const sizePatterns = [
    /티셔츠\s*사이즈\s*\(T-shirts[^)]*\)[^:]*:\s*([A-Z0-9]{1,3})/i,
    /티셔츠\s*사이즈[^:]*:\s*([A-Z0-9]{1,3})/i,
    /T-shirts\s*size[^:]*:\s*([A-Z0-9]{1,3})/i,
    /사이즈[^:]*:\s*([A-Z0-9]{1,3})/i
  ]
  for (const pattern of sizePatterns) {
    const match = optionRaw.match(pattern)
    if (match) {
      result.tshirtSize = match[1].toUpperCase()
      break
    }
  }

  // 성별 파싱
  const genderPatterns = [
    /성별\s*\([^)]*\)\s*:\s*([MF])/i,
    /성별\s*:\s*([MF])/i
  ]
  for (const pattern of genderPatterns) {
    const match = optionRaw.match(pattern)
    if (match) {
      result.gender = match[1].toUpperCase()
      break
    }
  }

  return result
}

// 전화번호 정규화
export function normalizePhone(phone: string): string {
  if (!phone) return ''
  // 숫자만 추출
  const digits = phone.toString().replace(/\D/g, '')
  // 10-11자리 확인
  if (digits.length === 10) {
    return digits.slice(0, 3) + '-' + digits.slice(3, 6) + '-' + digits.slice(6)
  }
  if (digits.length === 11) {
    return digits.slice(0, 3) + '-' + digits.slice(3, 7) + '-' + digits.slice(7)
  }
  return digits
}
