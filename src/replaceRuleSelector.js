import list from "postcss/lib/list"

import balancedMatch from "balanced-match"

const pseudoClass = ":matches"
const selectorElementRE = /^[a-zA-Z]/
const selectorUniversalRE = /^\*(?!\|)/
const selectorNamespacedUniversalRE = /\|\*$/

function isElementSelector(selector) {
  const matches = selectorElementRE.exec(selector)
  // console.log({selector, matches})
  return matches
}

function isUniversalSelector(selector) {
  const matches = selectorUniversalRE.exec(selector)
  // console.log({selector, matches})
  return matches
}

function isUniversalSelectorWithNS(selector) {
  const matches = selectorNamespacedUniversalRE.exec(selector)
  // console.log({selector, matches})
  return matches
}

function normalizeSelector(selector, preWhitespace, pre) {
  if (isUniversalSelector(selector) && isUniversalSelector(pre)) {
    return `${ preWhitespace }${ pre }${ selector.substring(1) }`
  }

  if (isElementSelector(pre)) {
    if (isUniversalSelector(selector)) {
      return `${ preWhitespace }${ pre }${ selector.substring(1) }`
    }
    else if (isUniversalSelectorWithNS(selector)) {
      return `${ preWhitespace }${
        selector.substring(0, selector.length - 1)
      }${ pre }`
    }
  }

  if (isElementSelector(selector)) {
    if (isUniversalSelector(pre)) {
      return `${ preWhitespace }${ selector }${ pre.substring(1) }`
    }
    else if (isUniversalSelectorWithNS(pre)) {
      return `${ preWhitespace }${
        pre.substring(0, pre.length - 1)
      }${ selector }`
    }

    else if (!isElementSelector(pre)) {
      return `${ preWhitespace}${ selector }${ pre }`
    }
  }

  return `${ preWhitespace }${ pre }${ selector }`
}

function explodeSelector(selector, options) {
  if (selector && selector.indexOf(pseudoClass) > -1) {
    let newSelectors = []
    const preWhitespaceMatches = selector.match(/^\s+/)
    const preWhitespace = preWhitespaceMatches
      ? preWhitespaceMatches[0]
      : ""
    const selectorPart = list.comma(selector)
    selectorPart.forEach(part => {
      const position = part.indexOf(pseudoClass)
      const pre = part.slice(0, position)
      const body = part.slice(position)
      const matches = balancedMatch("(", ")", body)

      const bodySelectors = matches && matches.body ?
        list
          .comma(matches.body)
          .reduce((acc, s) => [
            ...acc,
            ...explodeSelector(s, options),
          ], [])
        : [body]

      const postSelectors = matches && matches.post
        ? explodeSelector(matches.post, options)
        : []

      let newParts
      if (postSelectors.length === 0) {
        // the test below is a poor way to try we are facing a piece of a
        // selector...
        if (position === -1 || pre.indexOf(" ") > -1) {
          newParts = bodySelectors.map((s) => preWhitespace + pre + s)
        }
        else {
          newParts = bodySelectors.map((s) => (
            normalizeSelector(s, preWhitespace, pre)
          ))
        }
      }
      else {
        newParts = []
        postSelectors.forEach(postS => {
          bodySelectors.forEach(s => {
            newParts.push(preWhitespace + pre + s + postS)
          })
        })
      }
      newSelectors = [
        ...newSelectors,
        ...newParts,
      ]
    })

    return newSelectors
  }
  return [selector]
}

export default function replaceRuleSelector(rule, options) {
  const indentation = rule.raws && rule.raws.before
    ? rule.raws.before.split("\n").pop()
    : ""
  return (
    explodeSelector(rule.selector, options)
      .join("," + (options.lineBreak ? "\n" + indentation : " "))
  )
}
