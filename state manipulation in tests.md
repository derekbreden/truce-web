I wrote most of this code.

Recently, we had another AI write the integration tests, and had you write the server tests, and you've been working on the messaging feature.

In some of the tests, we have not been following my desired conventions.

The most egregious thing right now is that there is some direct state manipulation. I regret mentioning const { state, ... } = window in my original destructuring examples, as it has led to extensive direct use of state in tests, which is not desirable.

Theoretically, everything should be manageable by:

1) Clicking elements $("foo").click()
2) Setting input values $(`input[name="foo"]`).value = "bar"
3) Checking innerText $("main-content notifications h3 p span").innerText.trim()
4) Mocking fetch responses (this is really where all state should come from)

None of this state manipulation or state checking is necessary or desired.

It adds noise to the tests in reading them, and it doesn't help me verify anything the way it will actually happen in the browser for users.

Please keep in mind, as you consider your plan here, that we DO NOT want to have guard assertions that check for the existence of an element before checking some content on that element or some inner element within that parent element. Anytime you are simply checking the existence of an element, it is a bad sign, unless you truly need to and you absolutely do not check anything more precise on it after that (but really, shouldn't you be checking something more precise??)

I don't want you to make any changes yet. I'd like you to read some test files, see if you can find what I'm talking about, and come back to me with a plan. A plan that includes running tests before and after all incremental changes.