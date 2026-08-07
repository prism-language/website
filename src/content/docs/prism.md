# **1 · Introduction**

## **1.1 Overview**

Prism is a compiled systems language built for **explicit behavior and mechanical verification**.

Every construct has explicit and deterministic semantics. Nothing is hidden, inferred, or implicitly generated. The compiler may transform execution internally, but only in ways that preserve the observable behavior defined by the program.

Prism preserves the mental model of C while replacing convention and assumption with rules the compiler can verify.

The language is designed to remain **as small as possible**, while still allowing programs to scale from low-level control to large systems without introducing hidden abstractions.

---

## **1.2 Core Design**

Prism is built around a minimal core.

The core language defines only:

* data (primitives, structs, pointers)  
* functions  
* deterministic execution semantics

It does not define policy, ownership systems, or high-level abstractions.

Instead, Prism provides two fundamental mechanisms:

* effects \- used to express and enforce guarantees  
* compiler utilities \- used to query program structure and target information at compile time

These mechanisms allow behavior, constraints, and correctness rules to be built without expanding the core language itself.

The goal is:

> The core remains small and stable.  
> Power is introduced through mechanisms, not features.

---

## **1.3 Rulesets**

Prism defines correctness through **rulesets**.

A ruleset specifies which guarantees must be enforced by the compiler.  
It does not change how the language behaves semantically or introduce runtime systems.

In practice:

> **All programs use the `safe` ruleset.**

This includes:

* kernels  
* engines  
* compilers  
* embedded systems

Other rulesets exist as a design concept for the future, but are not part of the current programming model.

For all practical purposes:

> **Prism \= core language \+ `safe` ruleset**

---

## **1.4 Effects**

Effects are a core part of Prism.

They allow programs to:

* require guarantees  
* express constraints  
* verify assumptions

Effects do not introduce runtime behavior or hidden logic.  
They only define what must be proven for a program to be valid.

This allows safety and correctness to be:

* explicit  
* local  
* enforceable

Without changing execution semantics.

---

## **1.5 Prasm**

Prasm is the instruction-level form of Prism.

It provides direct access to:

* registers  
* stack layout  
* calling conventions  
* ABI constraints

Prasm is not a separate language.  
It is part of Prism and evolves alongside it.

Support for new instructions and architectures is added without changing the core language, typically through effects and compiler extensions.

Prism and Prasm together allow programs to be written and reasoned about from high-level structure down to exact machine execution.

---

## **1.6 Philosophy**

Prism is a systems language for developers who want precise control over execution.

It retains C’s core model:

* memory is memory  
* pointers are addresses  
* execution is direct

Where C relies on discipline, Prism makes those same rules **checkable**.

Prism does not prevent mistakes by restricting the programmer.  
It makes assumptions explicit and verifiable.

If a guarantee is required, it can be enforced.  
If it is not, Prism remains minimal and predictable.

Undefined behavior exists in Prism, especially around unchecked low-level operations, invalid pointer values, and backend assumptions.

Prism does not use undefined behavior as the primary way to describe ordinary safe code.

The safe ruleset attempts to reject or diagnose invalid operations before they reach execution.

In short:

> Prism is C with its assumptions made explicit and mechanically enforced.

---

## **1.7 Compilation Model**

A Prism compiler:

1. Parses source files  
2. Applies modules and effects  
3. Verifies rules required by the active ruleset (`safe`)  
4. Resolves all compile-time constructs  
5. Emits deterministic semantics

All core operations behave consistently in both debug and release builds.

A structural violation occurs when an operation violates the requirements of the safe Prism execution model.

Examples include:

* accessing memory outside valid bounds  
* interpreting memory as an incompatible type  
* extracting a value that does not exist

---

## **1.8 Structural Violations**

A structural violation occurs when an operation is applied to invalid or incompatible storage.

These violations are defined by the core language and are independent of rulesets.

Examples include:

* accessing memory outside valid bounds  
* interpreting memory as an incompatible type  
* extracting a value that does not exist

Structural violations are not accepted as valid safe Prism behavior.

When possible, the compiler rejects them or inserts checks.

If such an operation reaches optimized unchecked code, its behavior may be undefined.

Unless explicitly specified otherwise by the language, extracting a value that does not exist is a structural violation. Certain language features, such as `@uninit`, define controlled exceptions to this rule.

# 

# **2 · Effects**

## **2.1 Overview**

Effects are Prism’s fundamental mechanism for extending and annotating program behavior at compile time.

Effects do not change the meaning of core operations.

Effects never change the semantics of Prism programs. They may influence verification, layout, or code generation, but never alter the meaning of core language constructs.

Every effect is:

* explicitly written in source  
* attached to a single syntactic entity  
* processed deterministically

Nothing is inferred. Nothing is implicit.

Effects form the boundary between:

* the **core language**  
* the **ruleset and its verifiers**

Prism remains minimal.  
Effects allow projects to express richer guarantees without modifying the language itself.

All effects must be known to the active ruleset.

If an effect appears in source code that is not:

* a built-in effect, or  
* defined by the active ruleset

the compiler must emit an error.

Effects are never ignored.

---

## **2.2 Attachment Model**

An effect attaches to the next syntactic entity produced by parsing.

A syntactic entity is any construct forming a single AST node, including:

* declarations (`struct`, `fn`, `enum`, etc.)  
* types  
* blocks  
* expressions

The effect applies only to that node.

Effects:

* do not attach to tokens  
* do not span multiple nodes  
* do not propagate implicitly

All valid attachment positions are treated uniformly.  
There is no distinction between placement before or after keywords.

Invalid placements must produce a diagnostic.

Examples:

@packed struct A { ... }

struct @align(16) B { ... }

@cold fn slow\_path();

x \= @move y;

@unsafe { do\_thing(); }

---

## **2.3 Built-in Effects**

Prism includes only a minimal set of built-in effects required for machine-level correctness and layout control:

* `@align(N)` — enforce alignment  
* `@packed` — remove struct padding  
* `@cold` / `@hot` — execution-frequency metadata  
* `@arch(name)` — select target architecture  
* `@callconv(name)` — override calling convention  
* `@uninit` — allow uninitialized stack variables  
* `@ignore_ret` — allow to ignore the return value of a function

Built-in effects:

* do not introduce runtime behavior  
* affect only layout, validation, or code generation hints

---

## **2.4 Compiler Directive Effects (`@!`)**

Directive effects constrain how code is generated.

They are written using the `@!` prefix.

Unlike normal effects:

* they are not processed by verifiers  
* they cannot be ruleset-defined  
* they must be obeyed by the compiler

Directive effects:

* do not change program semantics  
* impose constraints on code generation  
* must cause compilation to fail if they cannot be satisfied

Example:

@\!naked

fn handler() {

    a: u8 = 3;

}

The compiler must not emit a prologue or epilogue.

Typical directive effects:

* `@!naked`  
* `@!inline`  
* `@!nosplitstack`

---

**Design Distinction**

| Prefix | Role |
| ----- | ----- |
| `@effect` | verification, metadata, or hints |
| `@!effect` | mandatory code generation constraint |

This separation ensures that:

* semantics remain independent from lowering  
* optimization hints cannot be confused with structural requirements

---

## **2.5 Effects on Expressions**

Effects may attach directly to expressions.

a \= @move b;

p \= @nonnull \&x;

index \= @bounds\_check i;

An effect always binds to the next **primary expression**.

A primary expression includes:

* dereference  
* indexing  
* field access  
* function calls

Examples:

* `@move &x` attaches to `&x`  
* `@nonnull y[3]` attaches to `y[3]`  
* `@cold f(x)->y` attaches to the full expression

This rule removes ambiguity in effect binding.

---

## **2.6 Effects on Blocks**

Effects may annotate blocks:

@unsafe {

    raw\_copy(ptr, src, len);

}

@cold {

    handle\_slow\_path();

}

A block effect applies only to statements within that block.

It:

* does not affect outer scopes  
* does not propagate automatically

---

## **2.7 Effect Resolution**

Effect processing occurs in three stages:

1. **Attachment**  
   Effects are bound to syntactic entities during parsing  
2. **Early Validation**  
   Built-in effects are validated immediately  
3. **Verification**  
   Ruleset-defined verifiers process rulset-defined effects

Ruleset-defined verifiers process ruleset-defined effects.

Verifier-effects do not modify the program AST.

They may emit diagnostics or request compiler-inserted runtime checks as permitted by the language specification.

---

## **2.8 Ruleset-Defined Effects**

All project-specific behavior is expressed through ruleset-defined effects.

Examples:

@move value

@noalias ptr

@final x

@tag(ShapeType::Circle)

The compiler does not interpret these effects.

It:

* records them  
* passes them to the ruleset’s verifiers

Effect meaning is entirely defined by the ruleset.

Effect names are scoped by the ruleset.  
Only effects declared by the active ruleset may appear in source.

This ensures:

* no collisions between modules  
* a fully known effect set at compile time

Clarifciation: Those effects are created by external verifiers, ruleset-defined effects means they are not built-in effects.

---

## **2.9 Debug vs Release Behavior**

Effects do not change semantics across build modes.

Verifiers may:

* insert runtime checks in debug builds  
* remove those checks in release builds

These checks may only detect states already invalid under the ruleset.

Removing them must not change the set of valid executions.

---

## **2.10 Conditional Annotations (`@?`)**

Conditional annotations enable declarations or statements only when a compile-time condition is satisfied.

Unlike ordinary effects, conditional annotations do not modify verification or code generation. They control whether the attached declaration or statement participates in compilation.

Conditional annotations are intentionally limited to a fixed set of built-in predicates and cannot be extended by rulesets.

Supported conditional annotations include:

@?os(name)

@?arch(name)

@?debug

@?release

Examples:

@?os(linux)

fn linux\_syscall(...) { ... }

@?arch(x86\_64)

fn asm rdtsc() \-\> u64 { ... }

@?debug

fn dump\_state() { ... }

@?release

const ENABLE\_LOGGING \= false;

If the condition evaluates to false, the attached entity is omitted from the program before semantic analysis.

Conditional annotations do not introduce runtime branching.

They exist solely to express platform- and configuration-dependent code.

The set of conditional annotations is fixed by the language and may not be extended by rulesets.

---

## **2.11 Design Intent**

Effects exist to extend Prism without increasing core complexity.

They provide:

* explicit control over verification  
* modular enforcement of rules  
* domain-specific behavior without new syntax

Goals:

* replace implicit conventions with explicit rules  
* maintain deterministic semantics  
* enable powerful extensions without language growth

Effects make Prism adaptable while keeping its foundation small, explicit, and verifiable.

# 

# **3 · Types and the Memory Model (Final Clean Version)**

---

## **3.1 Overview**

Prism keeps its type system intentionally small.

Every type is a direct description of memory layout and how the compiler is allowed to interpret it.  
There are no hidden fields, no implicit metadata, and no automatic behavior.

Types describe:

* storage  
* layout  
* interpretation

Nothing more.

The type system is designed to remain small.  
Higher-level reasoning is handled through **effects and compile time utilities**, not through additional type-level features.

---

## **3.2 Primitive Types**

The core set is fixed-width and architecture-invariant:

| Width | Unsigned | Signed |
| ----- | ----- | ----- |
| 8-bit | u8 | i8 |
| 16-bit | u16 | i16 |
| 32-bit | u32 | i32 |
| 64-bit | u64 | i64 |

Additional types:

* `usize`   
* `isize`   
* `uptr` \- pointer-sized unsigned integer  
* `iptr` \- pointer-sized signed integer

Booleans are represented in computation as `u1`in llvm lowering, for the values of false and true while in storage they are represented as `u8`.

---

**Integer Semantics**

Integer operations have well-defined behavior.

The default arithmetic operators (`+`, `-`, `*`) detect overflow according to the active ruleset. Under the Safe ruleset, an overflow causes execution to trap.

Wrapping arithmetic is performed explicitly using the wrapping operators:

\+%, \-%, \*%, /%

Wrapping operators compute their result modulo 2ⁿ, where *n* is the bit width of the result type. They never trap due to overflow.

Signedness affects the interpretation of integer values, not their storage.

Implicit integer promotion is permitted only between integer types of the same signedness and greater or equal width. Narrowing conversions and conversions between signed and unsigned integer types require an explicit cast.

Rulesets may define how arithmetic errors are handled. The Safe ruleset specifies that integer overflow traps at runtime. Other rulesets may provide different behavior, but the semantics of explicit wrapping operators remain unchanged.

---

## **3.3 Pointers (`*`)**

A pointer is a raw address.

\*u32 p;

\*mut u32 q;

Pointers introduce indirection and nothing else.

---

**Mutability**

Mutability is attached to the pointer itself, not the pointee type:

\*u32        // cannot write through this pointer

\*mut u32    // may write through this pointer

Each level of indirection carries its own mutability.

\*\*mut u32

* outer pointer → read-only  
* inner pointer → writable

---

**Nullability**

Pointers in Prism are **non-null by default in normal usage**, but null is still a representable value at the machine level.

To express nullability explicitly, Prism uses optionals:

?\*u32 ptr;

This represents a pointer that may be null.

The type system does not erase null — it makes it explicit.

---

## **3.4 Optionals (`?T`)**

**Overview**

Optionals represent values that may be absent.

x: ?u32;

ptr: ?\*u8;

An optional is either:

* a value of type `T`, or  
* an empty state (`null`).

Optionals are ordinary values. They do not introduce implicit control flow or hidden runtime behavior.

---

**Representation**

Conceptually, an optional is represented as:

?T ≡ union {

    T value;

    empty;

}

Properties:

* exactly one state is active  
* the empty state represents absence  
* `T` and `?T` are distinct types

For pointer types:

?\*u8

is represented directly as a nullable pointer.

No additional abstraction is introduced.

---

**Construction**

A value of type `T` may be implicitly promoted to `?T`:

x: ?u32 \= 5;

The empty state is constructed explicitly:

x: ?u32 \= null;

A present optional may also be constructed explicitly:

x: ?u32 \= ?{5};

`?{}` constructs exactly one level of optional.

For nested optionals:

a: ??u32 \= null;      // empty outer optional

b: ??u32 \= ?{null};   // present outer, empty inner

c: ??u32 \= ?{5};      // present outer, present inner

The expression inside `?{}` must be assignable to the payload type.

For example:

x: ?u32 \= ?{null};    // error

because the payload of `?u32` is `u32`, not `?u32`.

---

**Type Safety**

Optional types do not implicitly convert to their underlying type.

p: \*u8;

q: ?\*u8;

p \= q; // error

A value must be extracted before it can be used as its underlying type.

---

**Extraction (`.??`)**

An optional value may be extracted using `.??`:

x := optional\_val.??;

Semantics:

* value → extract the contained value  
* empty → abort execution

This asserts that a value must be present.

---

**Propagation (`.?`)**

Optionals participate in propagation using `.?`:

x := optional\_val.?;

Semantics:

* value → extract the contained value  
* empty → return `null` from the current function

This allows absence to propagate without explicit branching.

---

**Interaction with Functions**

Functions may return optional values:

fn find(ptr: \*u8) \-\> ?\*u8

Propagation composes naturally:

fn get\_value() \-\> ?u32 {

    x := find\_value().?;

    y := compute(x).?;

    return y;

}

The function returns `null` if any propagated optional is empty.

---

**Control Flow**

Optionals may be tested directly in conditional statements.

if (optional) |value| {

    use(value);

}

The body executes only if the optional contains a value.

Semantics:

* value → bind the contained value to `value` and execute the body  
* empty → skip the body

The bound value has the underlying type `T`, not `?T`.

For example:

user: ?User \= find\_user();

if (user) |u| {

    print(u.name);

}

An optional `else` branch may be provided:

if (user) |u| {

    print(u.name);

} else {

    print("User not found");

}

This construct is equivalent to explicitly testing the optional and extracting its value, but provides a concise syntax for the common pattern of handling present and absent values.

---

**Design Intent**

Optionals represent absence as a first-class value.

They are:

* explicit  
* statically type-checked  
* representation-defined

Optional operations are explicit:

* `null` constructs the empty state  
* `?{}` constructs a present optional  
* `.?` propagates absence or assigns the payload  
* `.??` extracts the payload or aborts

This aligns with Prism's execution model: computations produce either a value or a well-defined non-value state, with optionals representing absence in a predictable and explicit manner.

---

## **3.5 Structs**

Structs define raw memory layout.

struct Vec2 {

    x: f32;

    y: f32;

}

Struct layout is determined solely by:

* field order  
* field types  
* applied effects (`@align`, `@packed`)

The compiler does not insert hidden fields.

---

**Initialization**

a: Vec2 \= .{1,2};

b: Vec2 \= .{x:1, y:2};

All fields must be initialized explicitly.

v: Vec2 \= .{1}; // error

**Zero Initialization**

zero: Vec2 \= .{};

Sets all relevant bytes to zero.

---

**Uninitialized Storage**

@uninit v: Vec2;

Objects declared with `@uninit` may be read before initialization. Such reads are explicitly exempt from the normal structural violation rule for nonexistent values.

---

## **3.6 Unions**

Unions are raw overlapping storage.

union U {

    a: u32;

     b: f32;

}

Prism does not track the active variant.

Safety is provided only through rulesets, effects and stdlib constructs.

---

## **3.7 Arrays**

Arrays represent fixed-size contiguous memory.

numbers: \[4\]u32;

**Properties**

* size is a compile-time constant  
* elements are stored inline  
* no metadata is stored

**Storage**

Arrays are values that own their storage. They are not an indirection layer and therefore do not have a mutability qualifier.

Each element behaves as though it were declared as an independent variable within the array.

For example:

a: \[2\]Vec2 \= .{

    .{.x: 0, .y: 0},

    .{.x: 1, .y: 1},

};

Elements may be modified directly:

a\[0\] \= .{.x: 2, .y: 2};

a\[0\].x \+= 2;

This is conceptually equivalent to declaring multiple independent variables of the element type.

When the array length can be determined from the initializer, the `_` placeholder may be used to request size inference:

C := \[\_\]u32{1, 2, 3}; // inferred as \[3\]u32

The inferred length becomes part of the array's type.

**Indexing**

x \= arr\[i\];

Out-of-bounds access is a structural violation.

---

## **3.8 Slices**

Slices represent a pointer–length pair:

data: \[\]u8;

Lowering:

struct {

    ptr: \*u8;

    len: usize;

}

---

**Properties**

Slices:

* do not allocate  
* do not own memory  
* do not guarantee validity

They are purely structural.

---

**Indexing**

data\[i\]

Out-of-bounds access → structural violation.

---

## **3.9 Enums**

Enums define discrete values:

enum ShapeKind : u8 {

    circle \= 1,

    square \= 2,

}

Enums:

* are stored as integers  
* introduce no runtime behavior

Default type is not specified is **i32**.

Also allows for implicit only names conversions:

fn create\_shape(ShapeKind kind) \-\> \*Shape…

Then:

circle := create\_shape(.circle); 

Is the same as: 

circle := create\_shape(ShapeKind.circle)

---

## **3.10 Conversions and Structural Transformations**

Prism provides a small set of explicit conversion operations. Each conversion has a single purpose and well-defined semantics.

| Operation | Purpose |
| ----- | ----- |
| `cast[]` / `cast.numeric[]` | Convert a value while preserving its semantic meaning. |
| `cast.lossy[]` | Convert a value without preserving its exact value. |
| `cast.bit[]` | Reinterpret an existing bit representation. |
| `cast.addr[]` | Convert between address values and pointers. |
| `cast.ptr[]` | Reinterpret one pointer type as another. |

**Value Conversion**

`cast[]` converts a value while preserving its semantic meaning.

The destination value satisfies every guarantee required by the destination type. Whenever those guarantees cannot be proven statically, the compiler emits the runtime checks necessary to establish them. Under the Safe ruleset, a failed check aborts execution. Compilers should eliminate redundant checks whenever they can prove the conversion is valid.

`cast.numeric[]` is an alias of `cast[]`.

**Integer Conversions**

Integer conversions preserve the mathematical value.

x: u8

y \= x cast\[u16\]

requires no runtime checks because every `u8` value is representable as `u16`.

Converting from a signed to an unsigned integer succeeds only when the value is non-negative.

x: i32

y \= x cast\[u32\]

If necessary, the compiler emits code equivalent to:

if (x \< 0\)

    abort;

return (u32)x;

Likewise,

x: u32

y \= x cast\[u8\]

succeeds only when the value does not exceed `255`.

Conversions requiring multiple conditions validate every required property before producing the destination value.

**Floating-Point Conversions**

Floating-point conversions preserve the represented numeric value whenever possible.

When preserving the value depends on the runtime value, the compiler emits the necessary runtime validation before performing the conversion.

**Pointer Conversions**

Pointer value conversions establish every guarantee required by the destination pointer type.

These guarantees include mutability, alignment, and any future pointer qualifiers.

For example,

p: \*align(1) Vec2

q \= p cast\[\*Vec2\]

produces a naturally aligned pointer.

If the compiler cannot prove that `p` satisfies `alignof(Vec2)`, a runtime alignment check is emitted.

Likewise,

q \= p cast\[\*align(64) Vec2\]

checks that the pointer is 64-byte aligned before producing the result.

Pointer guarantees may always be weakened without validation.

For example,

\*align(64) T

may be converted to

\*align(16) T

without runtime checks.

---

**Lossy Conversion**

`cast.lossy[]` converts a value without preserving its exact value.

No runtime validation is performed.

Lossy conversions may truncate integers, change signedness, lose floating-point precision, or perform any other implementation-defined conversion that does not preserve the original value.

Examples:

large cast.lossy\[u8\]

negative cast.lossy\[u32\]

value cast.lossy\[f32\]

Lossy conversions should only be used when the programmer intentionally accepts loss of information.

---

**Bit Reinterpretation**

`cast.bit[]` reinterprets an existing bit representation without changing the stored bits.

The source and destination must have compatible representations.

Examples:

bits cast.bit\[f32\]

color cast.bit\[u32\]

Bit reinterpretation never converts between pointers and address values.

---

**Address Conversion**

`cast.addr[]` converts between the address domain (`usize` and `isize`) and the pointer domain.

For example,

addr: usize

p \= addr cast.addr\[\*Foo\]

produces a naturally aligned `*Foo`.

If the compiler cannot prove that `addr` satisfies `alignof(Foo)`, a runtime alignment check is emitted.

When no alignment guarantee is required, the destination type may explicitly request the weakest alignment.

p \= addr cast.addr\[\*align(1) Foo\]

No alignment check is generated.

The reverse conversion is always permitted.

addr \= p cast.addr\[usize\]

`cast.addr[]` is the only conversion between pointers and address values.

---

**Pointer Reinterpretation**

`cast.ptr[]` reinterprets one pointer type as another.

The pointer value itself is unchanged. Only its interpretation changes.

For example,

p: \*mut align(8) Bar

q \= p cast.ptr\[\*Foo\]

produces

\*mut align(8) Foo

without modifying the pointer value.

Changing pointer guarantees requires a value conversion.

p: \*align(1) Foo

q \= p cast\[\*Foo\]

If the compiler cannot prove the required alignment, the necessary runtime validation is emitted.

---

Prism also defines structural transformations that operate on the internal structure of a value rather than converting it to another type.

**Integer Bit Projection**

For integer values,

x\[lo..hi\]

projects the bit range `[lo, hi)` and produces an unsigned integer containing the selected bits.

v \= x\[lo..hi\]

The inclusive form

x\[lo..=hi\]

is equivalent to

x\[lo..(hi \+ 1)\]

Writing through the same syntax replaces the selected bit range.

x\[lo..hi\] \= v

No subobject is created, and the operation has no aliasing or lifetime semantics.

**Subslicing**

For arrays and slices, the same syntax produces a subslice.

sub \= slice\[lo..hi\]

sub \= slice\[lo..=hi\]

sub \= array\[lo..hi\]

The resulting slice references the original storage without copying data.

Conceptually, the operation adjusts the pointer and length.

ptr \= slice.ptr \+ lo;

len \= hi \- lo;

The inclusive form extends the upper bound by one element.

Subslice operations require:

lo \<= hi \<= len

Violating these constraints results in a structural violation.

Although integer projection and subslicing share identical syntax, they are distinct operations selected entirely by the operand type. Integer operands project bits, while arrays and slices produce subslices.

---

## **3.11 Implicit Conversions and Promotions**

Prism permits a small set of implicit conversions to eliminate obvious, lossless boilerplate.

Implicit conversions are allowed only when they:

* preserve the represented value,  
* preserve its interpretation, and  
* do not introduce stronger semantic guarantees.

**Integer Promotions**

Integer values may be promoted to a wider integer type of the same signedness.

u8 → u16 → u32 → u64

i8 → i16 → i32 → i64

For example,

a: u32

b: u64

a \+ b

implicitly promotes `a` to `u64`.

Implicit conversions between signed and unsigned integers are not permitted.

a: u32

b: i32

a \+ b      // error

An explicit conversion is required.

a \+ (b cast\[u32\])

**Floating-Point Promotions**

Floating-point values may be promoted to a wider floating-point type.

f32 → f64

For example,

a: f32

b: f64

a \+ b

implicitly promotes `a` to `f64`.

No implicit conversion exists between integers and floating-point values.

a: u32

b: f32

a \+ b      // error

An explicit conversion is required.

(a cast\[f32\]) \+ b

**Pointer Conversions**

Pointer types support a limited form of implicit compatibility conversion.

An implicit conversion is permitted only when every guarantee required by the destination pointer is already implied by the source pointer.

This requires:

* identical pointer depth,  
* identical pointee types,  
* mutability may only be removed,  
* alignment guarantees may only be weakened.

For example,

\*mut T          → \*T

\*align(32) T    → \*align(16) T

are allowed, while

\*T              → \*mut T

\*align(16) T    → \*align(32) T

are not.

These rules apply recursively to nested pointer types.

\*mut \*mut u8 → \*\*u8

is permitted, while

\*mut \*u8 → \*\*mut u8

is not.

Mutability and alignment apply independently at each pointer level.

Any pointer conversion that cannot be performed implicitly requires an explicit conversion.

**Address and Pointer Conversions**

No implicit conversion exists between pointers and address values.

p: \*u8

x: usize

p \= x      // error

x \= p      // error

Explicit address conversion is required.

p \= x cast.addr\[\*u8\]

x \= p cast.addr\[usize\]

**Optional Values**

Optional values never implicitly convert to non-optional values.

p: \*u8

q: ?\*u8

p \= q      // error

The optional value must first be explicitly handled or converted.

**Comparisons**

Comparison operators require both operands to have a common type obtainable through the implicit promotion rules.

Allowed:

u32 \< u64

f32 \< f64

Not allowed:

u32 \< i32

u32 \< f32

In these cases an explicit conversion is required.

Implicit conversions exist only to eliminate obvious, lossless boilerplate. Any operation that changes a value's meaning, interpretation, representation, or semantic guarantees must be written explicitly.

---

## **3.12 Contextual Construction (.)**

Prism provides a contextual construction mechanism using the `.` prefix.

This mechanism allows constructing a value of the expected type directly from an expression, without explicitly naming the type.

Syntax:

.\<expr\>

---

**Overview**

A contextual construction expression does not define its target type explicitly.

Instead, the target type is determined entirely from the surrounding context.

The expression:

.\<expr\>

means:

> construct a value of the expected type `T` from `expr`

where `T` is known from usage.

---

**Examples**

Strong type:

type Inode \= u32;

fn delete\_inode(inode: Inode);

delete\_inode(.5);   // equivalent to \[Inode\]5 or Inode{5}

Struct:

struct Str {

    data: \[\]u8;

}

fn print\_str(s: Str);

print\_str(."Hello");   // equivalent to Str{ "Hello" }

Enum (existing behavior):

create\_shape(.circle);

---

**Resolution**

Contextual construction is resolved using the expected type of the expression.

The expected type may come from:

* function parameter types  
* assignment targets  
* return types  
* explicitly annotated variables

Example:

x: Inode \= .5;

---

**Constraints**

Contextual construction is only valid when:

* the expected type is known  
* construction from the provided expression is valid  
* there is exactly one valid construction

Invalid cases:

x := .5;   // error — no expected type

struct Pair {

    a: u32;

    b: u32;

}

fn f(p: Pair);

f(.5);   // error — cannot construct Pair from an integer

struct Str {

    data: \[\]u8;

}

fn g(s: Str);

g(.5);   // error — invalid construction

---

**No Implicit Conversion**

Contextual construction is not an implicit conversion.

It requires explicit use of `.` and does not occur automatically.

Example:

delete\_inode(5);   // error

delete\_inode(.5);  // valid

---

**Relationship to Other Constructs**

Contextual construction is equivalent to explicit construction or casting, but with the target type inferred from context.

Equivalent forms:

.\<expr\>      ≡  T.{expr}

depending on the type and applicable construction rules.

---

**Restrictions**

* Contextual construction cannot be used without a known target type  
* It does not participate in function resolution or dispatch  
* It does not introduce new conversion rules  
* It cannot resolve ambiguity

---

**Design Intent**

Contextual construction exists to reduce verbosity while preserving explicit intent.

It provides a concise way to construct values of known types without weakening the type system or introducing implicit conversions.

All behavior remains:

* explicit  
* deterministic  
* Type-driven

---

## **3.13 Type Definitions and Aliases**

Prism distinguishes between **type definitions** and **type aliases**.

These serve different purposes and have different semantics.

---

**Overview**

Two constructs exist:

* `type` — defines a new, distinct type  
* `alias` — creates an alternate name for an existing type

They are not interchangeable.

---

**Type Definition (`type`)**

A `type` declaration creates a new type based on an existing representation.

type Inode \= u32;

`Inode`:

* has the same representation as `u32`  
* is a distinct type  
* does not implicitly convert to or from `u32`

Example:

fn delete\_inode(inode: Inode);

x: u32 \= 5;

delete\_inode(x);     // error

delete\_inode(.x);    // valid

Values must be explicitly constructed or cast.

---

**Alias (`alias`)**

An `alias` introduces a new name for an existing type.

alias str \= \[\]u8;

In this case `str`:

* is exactly the same type as `[]u8`  
* has no distinct identity  
* is interchangeable in all contexts

Example:

fn print(s: str);

x: \[\]u8 \= "hello";

print(x);   // valid

No conversion is required.

---

**Differences**

| Property | `type` | `alias` |
| ----- | ----- | ----- |
| Identity | distinct | identical |
| Implicit conversion | not allowed | always allowed |
| Representation | same as base | same as base |
| Type checking | strict | identical to base |

---

**Usage Guidelines**

Use `type` when:

* semantic distinction is required  
* accidental mixing must be prevented  
* stronger type safety is desired

Examples:

type UserId \= u32;

type FileId \= u32;

Use `alias` when:

* a clearer or domain-specific name is needed  
* no additional type safety is required

Examples:

alias str \= \[\]u8;

alias Buffer \= \[\]u8;

---

**Interaction with Contextual Construction**

Contextual construction (`.`) behaves differently:

* for `type`, it constructs a new value  
* for `alias`, it has no effect beyond naming

Example:

type Inode \= u32;

alias str \= \[\]u8;

delete\_inode(.5);     // constructs Inode

print(."hello");      // equivalent to \[\]u8 literal

---

**Design Intent**

The distinction between `type` and `alias` ensures:

* strong type safety where required  
* zero-cost naming where desired

Prism avoids implicit conversions between distinct types, while allowing aliases to remain lightweight and transparent.

This separation preserves:

* explicit intent  
* predictable behavior  
* minimal language complexity

## **3.14 Compiler Utilities**

Compiler utilities provide compile-time queries over information already known to the compiler. Unlike reflection systems, they cannot generate declarations, modify types, or transform source code.

They are evaluated at compile time and produce ordinary values.

Compiler utilities:

* do not generate code  
* do not generate declarations  
* do not generate types  
* do not modify program structure

They exist solely to expose information already known to the compiler or to express operations that map directly to machine-level instructions.

Compiler utilities are written using the `$` prefix.

Examples:

size := $sizeof\[u64\];

align := $alignof\[Vec3\];

bits := $popcnt(mask);

**Type and Layout Queries**

Prism provides utilities for querying properties of types.

Examples:

$sizeof\[T\]

$alignof\[T\]

$field\_count\[T\]

$field\_name\[T\](index)

$field\_type\[T\](index)

These utilities allow compile-time inspection of memory layout and type structure.

Example:

count := $field\_count\[Vec3\];

size := $sizeof\[Vec3\];

All results are compile-time constants.

**Target Queries**

Information about the current compilation target may be queried directly.

Examples:

$arch

$os

$abi

Example:

if ($arch \== .x86\_64) {

    ...

}

These values are compile-time constants.

**Bit Utilities**

Prism provides common bit-manipulation operations as compiler utilities.

Examples:

$clz(x)      // count leading zeros

$ctz(x)      // count trailing zeros

$popcnt(x)   // population count

$bswap(x)    // byte swap

These operations lower directly to efficient target instructions when available.

Example:

leading := $clz(mask);

count := $popcnt(mask);

**Constant Evaluation**

All compiler utilities evaluate during compilation.

Their results may be used anywhere a compile-time constant is required.

Example:

buffer: \[$sizeof(Packet)\]u8;

**Design Intent**

Compiler utilities expose information and operations already known to the compiler.

They provide controlled compile-time introspection without introducing reflection, code generation, or metaprogramming facilities.

Compiler utilities:

* observe  
* query  
* compute compile-time values

They never:

* generate declarations  
* generate functions  
* generate types  
* transform source code

This keeps compile-time reasoning simple, deterministic, and mechanically understandable.

# 

# **4 · Functions and Calling Semantics**

Functions in Prism are explicit mappings from inputs to outputs.

They:

* have no implicit behavior  
* introduce no hidden control flow  
* do not perform automatic allocation or cleanup

A function is defined entirely by its parameters, return type, and body.

---

## **4.1 Declaration**

All parameters follow:

identifier: type

**Example**

fn add(a: u32, b: u32) \-\> u32 

{

    return a \+ b;

}

---

**No return value**

fn log(msg: \*u8) 

{

    printf("%s", msg);

}

---

Functions:

* must declare all parameter types  
* must declare return type if non-void  
* do not perform implicit conversions beyond defined promotion rules

---

## **4.2 Naming and Uniqueness**

Function names are scoped to their module.

Within a single module:

* a function name may be declared only once  
* conflicting definitions are not allowed

fn print(x: u32);

fn print(x: \*u8); // error — Non-specialized declarations may appear only once.

---

Across modules:

* identical names are allowed  
* the module determines which function is referenced

Function identity is therefore:

(module, name)

---

There is no overloading within a module.

---

## **4.3 Calling Semantics**

Function calls are direct:

x := add(1, 2);

There is:

* no implicit dispatch  
* no implicit dereference  
* no hidden behavior

Arguments must match the function signature.

---

## **4.4 Method Syntax (`me`)**

Prism does not define methods as a language feature. Instead, it provides method syntax as a strict form of sugar over ordinary functions.

A function may declare a `me` parameter:

* fn push(me: \*mut VectorI32, value: u32) {  
*     me.\*.len \+= 1;  
* }


This allows the function to be called using method syntax:

* vec.push(10);


which lowers directly to:

* push(\&vec, 10);


A function may also declare `me` as its return value:

* fn make\_expr(src\_range: SourceRange) \-\> me: \*mut Expr;


Such functions may be called through the type they return:

* Expr.make\_expr(src\_range);


which lowers directly to:

* Expr\_Path::make\_expr(src\_range);


The `me` parameter or return value affects only call syntax. It does not introduce methods, member functions, or implicit dispatch. 

`me` may appear either as the receiver or as the return value, but not both.

Rules:

* `me` may appear either as the first parameter or as the return value, but not both.  
* A parameter named `me` must be the first parameter.  
* A return value named `me` must be the declared return value.  
* `me` is otherwise an ordinary parameter or return value.  
* No lookup or dispatch is performed beyond this syntactic transformation.

**Definition Restriction**

Functions using `me` must be defined in the same module as the type referenced by `me`.

This applies whether `me` appears as a parameter or as the return value.

This ensures:

* no external injection of methods,  
* clear ownership of behavior,  
* a single module controls all method syntax associated with a type.

---

## **4.5 Function Pointers**

Function types are just pointers in disguise:

my\_fn: fn(i32)-\>i32 \= function\_a;

code\_addr: \*u8 \= \[\*u8^\]my\_fn;              // Cast function pointer to raw pointer (code address)

res := my\_fn(5); // Can be called like every function

ptr\_to\_fn: \*fn(i32)-\>i32 \= \&my\_fn;

stack\_addr: \*u8 \= \[\*u8\]ptr\_to\_fn;          // Cast pointer-to-function-pointer to raw pointer (stack address)

---

## **4.6 Constructors and Destructors**

Constructors and destructors are ordinary functions.

fn init(cap: usize) \-\> me: VectorI32;

fn drop(me: \*mut VectorI32);

**Properties**

* no automatic invocation  
* no lifetime tracking  
* no hidden cleanup

**Example**

v: VectorI32 \= VectorI32.init(...);

defer v.drop();

---

## **4.7 Return Values**

Functions return values explicitly.

fn square(x: u32) \-\> u32 {

    return x \* x;

}

Return values must be used.

square(5); // error

**Explicit discard**

@ignore\_ret square(5);

---

Yes. I actually think this is worth rewriting rather than patching. The structure is good, but the terminology can be made much more rigorous without making it longer.

The biggest improvement is to define the model **once** in §4.8 and then let §§4.9 and 4.10 build on it.

I'd rewrite them something like this.

---

## **4.8 Error Types and Failure Semantics**

**Overview**

Prism models failure as an explicit control-flow transition into a typed error state. A function either produces a result or exits through an error state.

fn open\_file(name: str) \-\> Handle \!;

fn parse(data: \[\]u8) \-\> AST \!;

The `!` marker indicates that a function may fail. It does not describe which errors may occur—only that the function participates in error flow.

An error in Prism consists of three related concepts:

* an **error type**, declared with `err`  
* an **error value**, which stores any associated payload  
* an **error state**, the active control-flow state carrying an error value

Error values are accessible only while handling an active error state.

**Error Types**

Error types are declared independently.

err io::NotFoundErr;

err io::PermissionErr;

err fmt::FormatErr;

Each error type:

* represents one distinct failure condition  
* may contain payload data  
* has no inheritance or hierarchy  
* is identified solely by its type

Prism has:

* no error-set types  
* no error unions  
* no structural composition of errors

Each fallible function has a set of possible error states determined by its execution.

**Emitting Errors**

Errors are emitted explicitly.

fn open\_file(name: str) \-\> Handle \! {

    if (\!exists(name))

        fail io::NotFoundErr.{ name };

}

Executing `fail`:

1. constructs an error value,  
2. enters the corresponding error state,  
3. immediately exits the current function.

Rules:

* `fail` may only appear in fallible functions.  
* The emitted value must be an error type.  
* Execution never continues after `fail`.

Optionally, a function may declare the exact errors it emits.

fn open\_file(name: str) \-\> Handle \! { NotFoundErr } {

    ...

}

The compiler verifies that only the declared error types may be emitted.

Explicit error lists improve tooling, documentation, API stability, and diagnostics.

**Error Values**

While an error state is propagating, its contained value is not accessible.

An error value becomes available only when an error state is handled.

func() err io::NotFoundErr(e): {

    print(e.name);

    fail e;

}

Within the handler, `e` is an ordinary value of type `io::NotFoundErr`.

It may be:

* inspected  
* copied  
* stored  
* re-emitted with `fail`

Outside the handler, the value is no longer accessible unless explicitly stored in ordinary program data.

**Design Intent**

Errors are:

* typed  
* explicit  
* part of control flow

They are not:

* return values  
* exception objects  
* composable containers

A function either returns normally or transitions into an error state carrying an error value.

---

## **4.9 Error Transformation and Propagation**

**Propagation**

Propagation is explicit.

x := open\_file(name).\!;

Semantics:

* success → extract the result  
* error → propagate the active error state to the caller

Rules:

* `.!` may only appear inside fallible functions.  
* Propagation is always explicit in source.

During propagation the error state remains active, but its contained value is not accessible.

**Handling**

Error states are handled using `err`.

res := open\_file(name) err {

    NotFoundErr(e): fallback

    DBDownErr(e): fallback

    else: fallback

};

Each handler consists of:

* an error type  
* an optional value binding  
* a block expression

If the active error state matches the handler's type, its contained value is bound to the specified variable.

**Handling Semantics**

Handling succeeds only if execution leaves the error state.

func() err {

    NotFoundErr(e): fallback

    PermissionErr(e): { log(e); }

}

Rules:

* producing a value resolves the error state  
* `fail` enters a new error state  
* `return` exits the function  
* reaching the end of a handler without resolving the error is a compile-time error

**Re-emission**

An existing error value may be re-emitted.

func() err io::NotFoundErr(e): {

    log(e);

    fail e;

}

This creates a new active error state carrying the same error value.

**Transformation**

Errors may be transformed into different error types.

func() err NotFoundErr(e): {

    fail PermissionErr.{ e.name };

}

The original error state is resolved and replaced by a new one.

**Design Intent**

Error handling:

* operates on explicit control-flow states  
* exposes error values only while handling  
* composes locally and predictably

Error analysis is derived entirely from execution flow.

---

## **4.10 Abort Extraction and Inspection**

**Abort Extraction**

`.!!` extracts a successful value or aborts execution.

x := open\_file(name).\!\!;

Semantics:

* success → extract the value  
* error → terminate the program

**Combined with Handling**

x := open\_file(name) err {

    io::NotFoundErr: fallback

}.\!\!;

Flow:

* `io::NotFoundErr` → handled  
* every other error state → abort

**Diagnostics**

The compiler and tooling expose error flow information, including:

* possible error states at an expression  
* propagated errors through `.!`  
* unhandled errors  
* unreachable handlers

Example:

unhandled errors:

    io::PermissionErr

    fmt::FormatErr

**Summary**

* `fail` constructs an error value and enters an error state.  
* `.!` propagates the active error state.  
* `err` handles an error state and exposes its contained value.  
* `.!!` aborts if an error state remains active.

All error behavior in Prism is:

* explicit  
* deterministic  
* flow-driven

Possible errors are derived from execution rather than declared through type-level error sets.

---

## **4.11 `defer`**

defer cleanup();

**Semantics**

* executes at scope exit  
* executes in LIFO order  
* no hidden runtime

Applies to:

* normal return  
* error propagation

---

## **4.12 ABI and Calling Convention**

Functions may specify lowering behavior:

@callconv(SysV)

@arch(x86\_64)

fn foo(x: u64) \-\> u64;

These:

* affect code generation  
* do not change semantics

---

## **4.13 No Implicit Behavior**

Prism does not allow:

* implicit overloading  
* implicit dispatch  
* implicit cleanup  
* exception systems  
* hidden conversions

All behavior is explicit and visible in source.

## **4.14 Optional and Error Capture Conditions**

Conditional statements may capture the success value of optional or error-producing expressions.

if (optional\_value) |value| {

    io::println(value);

}

The condition succeeds only if the optional contains a value.  
The contained value is then bound to the specified identifier within the conditional scope.

Equivalent conceptual lowering:

tmp := optional\_value;

if (tmp \!= null) {

    value := tmp.?;

}

This syntax also applies to error-producing expressions:

if (parse\_expr()) |expr| {

    io::println(expr.kind());

}

The condition succeeds only if the expression completed without error.  
The successful result is bound to the specified identifier.

Conceptual lowering:

tmp := parse\_expr();

if (\!tmp.is\_error()) {

    expr := tmp.value();

}

Capture conditions are valid only within control-flow condition contexts such as:

if (...)

while (...)

They are not general expressions and do not participate in operator precedence.

# **5\. Prasm**

Prasm is Prism at the level of the machine.

Prasm exposes primitive machine operations rather than Prism language semantics. A Prasm instruction performs only the behavior defined by that instruction. Prism operations that require additional runtime checks or control flow do not necessarily have a direct Prasm equivalent.

It exposes registers, stack layout, ABI behavior, and instruction execution directly, while preserving structured control flow.

All behavior must be mechanically representable.

> No implicit behavior exists.

* no hidden data movement  
* no hidden temporaries  
* no implicit register usage  
* no automatic ABI correction

If Prasm compiles, the machine behavior is exactly what is written.

---

## **5.1 Architecture and ABI**

Architecture is optional and defaults to the project target.

@arch(x86\_64)

This does not define the architecture, it verifies that the current compilation target matches.

ABI may be overridden:

@abi\!(SysV)

Architecture defines:

* registers  
* aliasing relationships  
* instruction set

ABI defines:

* argument registers  
* return registers  
* stack alignment  
* caller/callee-saved rules

Prasm enforces ABI correctness.

---

## **5.2 Register Ownership and Reservation**

Registers must be explicitly managed.

reserve rbx, r12, stack 32

Rules:

* registers that must be preserved must be declared with `reserve`  
* no implicit save/restore exists  
* stack reservation is explicit

Escape hatch:

@saved\_register(rbx)

This disables verification for that register.

The compiler assumes it is preserved correctly.

---

## **5.3 Storage Model**

Every value has explicit storage.

a rax: u64

b rbx: u64

c stack: u64

Rules:

* storage is required  
* overlapping storage is forbidden  
* registers are physical locations  
* stack layout is fixed

---

## **5.4 Expressions and Assignment**

Expressions form a restricted subset.

Assignment defines computation and movement.

a rax: u64 := b \+% c

Lowering:

rax \= rbx

rax \+%= rcx

Rules:

* operands must have identical types  
* result must match destination storage  
* evaluation is left-to-right  
* lowering must not require implicit temporaries  
* only the destination register may be used

Operator precedence exists:

a := b ^ c \+% d

is valid and evaluated according to operator rules.

---

Allowed:

a := b \+% c

a := b \+% c \+% d

a := b ^ c

a := b & c

---

Invalid:

a := b \+% c \*% d   // '\*' not allowed in expressions

a := y \+% func(x)// ordering violation

---

Type equality is required:

b16 ax: u16 := \[u16\]b8

a rax: u16 := b16 \+% c

---

## **5.5 Function Calls**

Function calls are allowed in expressions under strict constraints.

a rax := func(3)

Valid if:

* arguments are already in correct registers  
* return register matches destination  
* no hidden temporaries are required

---

Argument mismatch:

arg rdi: u64 \= b;

a rax := func(arg)

---

Registers required for arguments must be available:

lend rdi

a rax := func(3)

unlend rdi

---

After a call:

* caller-saved registers are considered destroyed  
* values in those registers become invalid

---

Ordering matters:

a rax := func(3) \+% 5      // valid

a rax := 5 \+% func(3)      // invalid

---

Rule:

> Calls must not introduce implicit movement or violate evaluation order.

---

## **5.6 Lending**

Lending provides temporary registers for expression lowering.

lend r8, r9

...

unlend r8, r9

or:

lend r8 {

    ...

}

---

Meaning:

* lent registers are available to the compiler  
* lent registers cannot be used in source  
* lent registers are fully clobbered

---

Rules:

* variables bound to lent registers become invalid  
* lent registers cannot be referenced or assigned  
* lending does not change instruction semantics  
* all paths must release lent registers

---

Used for complex expressions:

lend r8

a := (b \+% c) \- (d ^ e)

unlend r8

---

## **5.7 Control Flow**

Structured control flow is supported.

a rax: u64 \= 0;

i rcx: u64 \= 0;

n rdx: u64 \= 10;

while (i \< n) {

    a \+%= i;

    i \+%= 1;

}

Rules:

* control flow lowers directly to jumps  
* no implicit data movement  
* conditions follow expression rules

---

## **5.8 Instructions**

Instructions provide full control.

Instructions invoke primitive operations directly. They are not lowered forms of Prism expressions and do not inherit Prism operator semantics. A Prasm instruction performs exactly the operation defined by its instruction contract.

\#instr inputs \-\> outputs

---

Examples:

\#add b, c \-\> a rax: u64

\#mul b, c \-\> lo rax: u64, hi rdx: u64

\#idiv hi, lo, b \-\> q rax: u64, r rdx: u64

---

Rules:

* outputs must declare storage  
* types must be specified or inferable  
* instruction contracts must be satisfied exactly  
* no implicit operands  
* no implicit clobbers

Some Prism operations have no single-instruction Prasm equivalent. For example, checked integer addition under the Safe ruleset may require multiple instructions or control flow. When a direct instruction mapping is required, the corresponding machine-semantic Prism operation (such as `+%`) should be used before lowering to Prasm.

---

## **5.9 Return Values and ABI**

Return storage is explicit.

fn asm f(a rdi: u64) \-\> result rax: u64

Multiple returns:

\-\> (lo rax: u32, hi rdx: u32)

---

Struct returns:

fn asm build(

    sret rdi: \*Point,

    x rsi: u64,

    y rdx: u64

)

Rules:

* sret must be explicit  
* ABI must be satisfied  
* no implicit transformations

---

ABI introspection:

$abi.stack\_align

$abi.param\_regs

$abi.ret\_regs

$abi.callee\_saved

---

## **5.10 Design Summary**

Prasm guarantees:

* explicit storage  
* explicit movement through assignment  
* explicit instruction behavior  
* strict ABI correctness  
* no implicit lowering

Final rule:

> If Prasm compiles, every machine effect is visible in the source.

## **5.11 Experimental GPU Support**

> **Experimental**

> GPU support is currently experimental and does not exist in the current implementation.

> This section describes the intended direction of GPU Prasm. The exact semantics, supported architectures, and instruction set are subject to change.

GPU functionality is part of Prasm. It is not a separate language.

GPU functions are declared using the `gpu` function modifier.

fn gpu draw\_pixel(...) {

    ...

}

Like `fn asm`, a GPU function exposes machine-level behavior directly. GPU-specific operations are explicit and are defined by the selected target architecture.

---

## **5.12 GPU Architecture**

GPU architectures contribute architectural values, instructions, storage classes, and execution rules.

Architectural values are exposed through the `gpu` namespace.

gpu.thread\_id

gpu.block\_id

gpu.grid\_size

gpu.subgroup\_id

These values represent machine state. They are **not** compile-time constants.

Compile-time GPU information is exposed through `$gpu`.

$gpu.subgroup\_size

$gpu.max\_workgroup\_size

$gpu.shared\_alignment

Like the rest of Prasm, target-specific features only exist when supported by the selected architecture.

---

## **5.13 Storage and Instructions**

GPU Prasm follows the same explicit storage model as the rest of Prasm.

Values declare where they are stored.

index reg: u32;

cache shared: \[256\]u32;

input global: \*const u32;

output global: \*u32;

Available storage locations are defined by the selected GPU architecture.

GPU operations are primitive instructions.

\#barrier

\#atomic.add

\#subgroup.shuffle

Instructions perform exactly the machine behavior defined by the target.

No barriers, synchronization, memory movement, or other GPU behavior is inserted implicitly.

# 

# **6 · Modules, Imports, Visibility, and Name Ownership**

## **6.1 Overview**

Prism organizes code by **modules**.

A module is both:

* a **namespace**  
* an **ownership boundary**

Every name belongs to exactly one module.  
Functions, types, constants, effects, requirement groups, and other declarations are owned by the module in which they are defined.

Prism does not use headers, textual inclusion, or preprocessor-based declaration sharing.  
A declaration exists once, in the module that owns it.

This gives Prism three important properties:

* name ownership is explicit  
* visibility is determined structurally  
* resolution is deterministic

---

## **6.2 Module Structure**

A module is defined by a directory in the source tree.

Example:

src/

    math/

        cmp.pr

        max.pr

    io/

        file.pr

        encode.pr

This defines the modules:

math

io

A nested directory defines a nested module:

src/

    net/

        http/

            client.pr

            request.pr

This defines:

net::http

All `.pr` files in the same directory belong to the same module and compile together.

Files do not define namespaces by themselves.  
Files are only a way to split the contents of a module.

A file in `src/math/` belongs to `math`.  
A file in `src/net/http/` belongs to `net::http`.

Prism does not require repeating a `module ...;` declaration in every file.  
The directory structure is the module structure.

---

## **6.3 Name Ownership**

Every declaration is owned by exactly one module.

Examples:

fn math::cmp\[T\](a: \*T, b: \*T) \-\> i32;

fn io::encode\[Writer, T\](w: \*mut Writer, v: \*T);

struct net::http::Client { ... }

This ownership is fundamental.

It determines:

* where a name lives  
* how it is imported  
* who may define specializations  
* which module controls method syntax for a type

Prism never has “floating” global names shared across unrelated modules.

Two modules may define the same short name:

fn math::cmp\[T\](...);

fn sort::cmp\[T\](...);

These are completely different function families.

---

## **6.4 Imports**

Modules are brought into scope explicitly.

Example:

use math;

use io;

Then names are accessed through the module:

math::cmp(\&a, \&b);

io::encode(\&writer, \&value);

Prism may also allow importing a specific name:

use math::cmp;

Then:

cmp(\&a, \&b);

is valid.

If multiple imported modules would make a short name ambiguous, the compiler reports an error.  
Prism never silently chooses one.

Example:

use math::cmp;

use sort::cmp;

cmp(\&a, \&b); // error: ambiguous imported name

In that case the call must be written explicitly:

math::cmp(\&a, \&b);

sort::cmp(\&a, \&b);

Imports only bind names.  
They do not execute code, re-export implicitly, or change visibility.

---

## **6.5 Visibility**

Prism visibility is module-based.

There are four visibility levels:

* `public`  
* `internal`  
* `private`  
* `api`

**api**

Visible outside the project (other projects / libraries).

api fn connect();

api struct Packet { ... }

**public**

Visible across modules (inside the same project).

public fn connect\_internal();

public struct PacketBuilder { ... }

**internal**

Visible anywhere inside the same module.

internal fn normalize();

internal struct ParserState { ... }

**private**

Visible only inside the current file.

private fn helper();

---

## **6.6 Why Visibility Is Module-Based**

Prism does not tie visibility to classes, methods, inheritance, or special receiver rules.

Access is determined only by where code is located:

* Current file: private, internal, public, api

* Other files in the same module: internal, public, api

* Other modules in the same project: public, api

* Other projects: api

This rule applies uniformly to:

* free functions  
* types  
* fields  
* constants  
* helper declarations

Method syntax does not grant extra access.  
A function using `me` is still subject to ordinary module visibility rules.

---

## **6.7 Method Syntax and Module Ownership**

Method syntax is controlled by the module of the receiver type.

Example:

fn push(me: \*mut Vector, T value)

{

    ...

}

This allows:

vec.push(x);

which lowers to:

push(\&vec, x);

A function may take another module’s type as a parameter:

fn normalize(\*math::Vec2 v)

{

    ...

}

But defining such a function outside the type’s module does not let that module inject method syntax for the type.

So Prism separates two things:

* **behavior** may be defined by ordinary functions in any permitted module  
* **method syntax** is controlled by the type’s owning module

This prevents unrelated modules from silently extending another module’s public surface.

---

## **6.8 Modules and Generic Behavior**

Because functions are owned by modules, generic requirements are module-qualified too.

Example:

fn max\[T\](a: \*T, b: \*T) \-\> \*T

{

    return math::cmp(a, b) \> 0 ? a : b;

}

This does not require that some function named `cmp` exist. It specifically requires `math::cmp[T]` to exist for the instantiated type.

It means:

> `math::cmp[T]` must exist for the instantiated `T`.

That is one of the main reasons Prism uses module ownership so aggressively:  
generic behavior stays explicit.

A generic function call is never resolved through hidden lookup or unrelated namespaces.  
The owning module is part of the identity of the function family.

---

## **6.9 Specialization and Module Ownership**

A specialization extends the function family it names.

Example:

fn math::cmp\[MyType\](a: \*MyType, b: \*MyType) \-\> i32

{

    ...

}

This is a specialization of `math::cmp`, not a new unrelated function called `cmp`.

A specialization may only be defined if the current module owns:

* the function family, or  
* the concrete type being specialized

This keeps specialization coherent while still allowing user-defined types to participate in foreign function families.

Primitive types are unowned, so primitive specializations may only be defined by the module that owns the function family.

There may be at most one specialization for a given (function family, concrete generic arguments) in a program. 

A specialization is owned by the module in which it is defined, even when specializing a function family owned by another module. Ownership determines compilation, visibility, and linkage. Generic resolution is performed through the function family, allowing specializations owned by different modules to participate in generic resolution without requiring modification of the function family's owning module.

---

## **6.10 No Headers, No Include Graphs**

Prism does not use:

* `#include`  
* forward-declaration headers  
* textual duplication of declarations  
* preprocessor-driven import behavior

A module is parsed once.  
Its declarations are stored once.  
Other modules import names rather than copying declarations into their own files.

This avoids:

* header pollution  
* include-order bugs  
* repeated declaration maintenance  
* accidental namespace leakage

---

## **6.11 Build Model**

Modules compile as units.

All files in the same module are parsed and analyzed together.  
The compiler first collects the module’s declarations, then performs semantic analysis, generic resolution, specialization collection, and code generation.

Because modules are explicit ownership boundaries, the compiler can build direct lookup tables for:

* names in the module  
* imported names  
* specializations belonging to module-owned function families

This keeps compilation deterministic and makes generic lookup straightforward.

---

## **6.12 Design Intent**

Prism’s module model exists to enforce a simple rule:

> names belong somewhere

That rule drives the rest of the language:

* behavior is defined by module-owned functions  
* generic requirements are expressed through explicit module-qualified calls  
* visibility follows module boundaries  
* specialization remains coherent  
* method syntax stays local to type ownership

This avoids the header model of C, the implicit extension behavior found in some higher-level languages, and the hidden resolution rules that make large systems hard to reason about.

In Prism, if a name is used, its owner is known.

---

## **6.13 Deterministic Builds**

Prism guarantees **deterministic builds**.

Given the same source code and inputs, the compiler will always produce the same result, independent of:

* file order  
* import order  
* compilation order  
* build system behavior

---

**No Order-Dependent Resolution**

Name resolution in Prism is not affected by the order in which modules are compiled or imported.

Example:

use math;

use sort;

and:

use sort;

use math;

produce identical results.

If a name is ambiguous:

use math::cmp;

use sort::cmp;

cmp(\&a, \&b);

the compiler emits an error. It does not attempt to choose one.

---

**No Implicit Extension or Injection**

Modules cannot silently modify the behavior of other modules.

A function call:

math::cmp(a, b);

always refers to the `math::cmp` function family, and resolution depends only on:

* the concrete types involved  
* the explicitly defined specializations

It does not depend on:

* which modules were imported  
* which files were compiled first  
* which definitions happened to be visible earlier

---

**Why This Matters**

This design avoids common sources of non-determinism:

* include-order bugs  
* implicit extension mechanisms  
* hidden overload resolution rules  
* module import side effects

In Prism:

> A function call resolves only from its name, its module, and its concrete types.

Nothing else influences the result.

# **7 · Generic Functions, Requirements and Specialization**

## **7.1 Overview**

Prism provides two mechanisms for generic behavior:

● universal generic functions  
● specialization-based function families

A universal generic function contains a body that is instantiated for concrete types.

A specialization-based function family declares behavior that must be provided explicitly through specializations.

Both mechanisms are built on the same generic parameter system.

Requirements may be used to constrain generic parameters and express which generic function families must be available for a particular instantiation.

Prism defines behavior through functions.

Types do not own behavior.

Requirements do not own behavior.

Functions own behavior.

Generic parameters, requirements, and  specialization exist only to determine whether a particular function implementation may be used.

## **7.2 Universal Generic Functions**

A universal generic function contains a generic body that is instantiated for concrete types as needed.

Example:

fn max\[T\](a: T, b: T) \-\> T  
{  
     return a \> b ? a : b;  
}

When max is used, the compiler creates an instantiation using the concrete type arguments.

Examples:

a: u32 \= max(10, 20);  
b: f64 \= max(1.5, 3.0);

Conceptually:

max.\[u32\]  
max.\[f64\]

are generated from the same generic definition.

A universal generic function is not required to be valid for all possible types.

Instead, validity is checked for each instantiation individually.

Example:

struct Vec2 {  
     x: f32;  
     y: f32;  
}

a: Vec2;  
b: Vec2;

max(a, b);

This is invalid because the instantiated body requires the \> operator, and \> is not defined for Vec2.

The compiler emits an error during instantiation.

Properties:

● instantiation occurs when the function is used  
● validation occurs on the instantiated body  
● no hidden fallback behavior exists  
● invalid instantiations are compile-time errors

Universal generic functions provide a single implementation that may be reused across many concrete types.

The generated behavior is always derived from the generic body itself.

## **7.3 Type and Value Generic Parameters**

Prism supports two kinds of generic parameters:

● type parameters

● value parameters

Type parameters represent types.

Value parameters represent compile-time constant values.

The syntax separates type parameters from value parameters using ;.

This distinction exists so the parser can distinguish types from expressions without ambiguity.

Type-only generic parameter lists are written normally:

fn max\[T\](a: T, b: T) \-\> T

{

    return a \> b ? a : b;

}

Here, T is a type parameter.

Value generic parameters are written after ;.

Example:

fn copy\[; N: usize\](arr: \*\[N\]u8)

{

    ...

}

Here, N is a compile-time value parameter of type usize.

The value N may be used wherever a compile-time constant of type usize is required.

For example:

\[N\]u8

is an array type whose size is determined by the value parameter N.

Generic types use the same separation.

Examples:

Array\[u8; 12\]

HashMap\[u8, str\]

HashMapCapacity\[u8, str; 16\]

In these examples:

● u8 and str are type arguments

● 12 and 16 are value arguments

The ; separates type arguments from value arguments.

A generic parameter list may contain only type parameters:

\[T, U\]

only value parameters:

\[; N: usize, Align: usize\]

or both:

\[T, U; N: usize\]

Example:

fn make\_buffer\[T; N: usize\]() \-\> \[N\]T

{

    ...

}

Generic argument lists follow the same structure:

make\_buffer\[u8; 64\]();

Rules:

● type parameters appear before ;

● value parameters appear after ;

● value parameters must have declared types

● value arguments must be compile-time constants

● value parameters do not represent runtime variables

● the ; is omitted when no value parameters exist

This gives Prism a single generic syntax while keeping type arguments and value arguments structurally distinct.

## **7.4 Specialization-Based Function Families**

Not all generic behavior can be expressed through a single universal implementation.

Prism therefore provides specialization-based function families.

A specialization-based function family declares a generic function interface without providing a body.

Example:

fn math::cmp\[T\](a: \*T, b: \*T) \-\> i32;

This declaration defines a function family.

The family itself contains no behavior.

Behavior is provided through explicit specializations.

Example:

fn math::cmp\[u32\](a: \*u32, b: \*u32) \-\> i32

{

    return a.\* \- b.\*;

}

fn math::cmp\[f32\](a: \*f32, b: \*f32) \-\> i32

{

    return a.\* \- b.\*;

}

When the compiler encounters:

math::cmp(\&a, \&b);

it determines the concrete type arguments and resolves the matching specialization.

For:

a: u32;

b: u32;

math::cmp(\&a, \&b); 

the compiler resolves:

math::cmp.\[u32\]

If no specialization exists, compilation fails.

Example:

struct Vec2 {

    x: f32;

    y: f32;

}

a: Vec2;

b: Vec2;

math::cmp(\&a, \&b);

Error:

no specialization of math::cmp for Vec2

A specialization may be defined only by:

● the module that owns the function family, or

● the module that owns at least one concrete type being specialized

Example:

struct MyType {

    value: u32;

}

fn math::cmp\[MyType\](a: \*MyType, b: \*MyType) \-\> i32

{

    return a.\*.value \- b.\*.value;

}

This is valid because the current module owns MyType.

A module that owns neither math::cmp nor MyType may not define this specialization.

Primitive types are unowned.

Therefore, specializations for primitive types may only be defined by the module that owns the function family.

Example:

fn math::cmp\[u32\](a: \*u32, b: \*u32) \-\> i32

{

    return a.\* \- b.\*;

}

This specialization may only be defined by the module that owns math::cmp.

Properties:

● the family declaration does not contain behavior

● behavior is provided entirely through specializations

● specialization lookup is exact

● no implicit conversions participate in lookup

● missing specializations are compile-time errors

● a specialization must obey module ownership rules

● primitive specializations may only be defined by the function-family owner

A specialization-based function family defines a set of possible implementations.

Only explicitly defined and ownership-valid specializations may be used.

## **7.5 Requirements**

Requirements provide a way to express which generic function resolutions must succeed for a particular instantiation.

A requirement does not define behavior.

A requirement names one or more generic obligations.

Example:

require Comparable\[T\] \= math::cmp\[T\];

This requirement states that:

math::cmp\[T\]

must resolve successfully.

Requirements may reference any generic function family.

Example:

require Writable\[W\] \=  io::write\_bytes\[W\];

A type satisfies a requirement when every referenced generic resolution succeeds.

Examples:

Comparable\[u32\]

Writable\[FileWriter\]

are satisfied only if the corresponding specializations exist and are ownership-valid.

Requirements may be combined.

Example:

require Serializable\[T\] \=

    io::write\[T\]

    \+ io::read\[T\];

A combined requirement is satisfied only if every referenced resolution succeeds.

Requirements are used to constrain generic declarations.

Example:

\[Comparable\[T\]\]

fn sort(data: \*T)

{

    ...

}

This means:

math::cmp\[T\]

must resolve for the instantiated type.

Requirements may constrain multiple generic parameters.

Example:

require Addable\[T, U\] \=

    math::add\[T, U\];

require Comparable\[T, U\] \=

    math::cmp\[T, U\];

\[Addable\[T, U\] \+ Comparable\[T, U\]\]

fn sub(a: \*T, b: \*U) \-\> T

{

    ...

}

This requires both:

math::add\[T, U\]

math::cmp\[T, U\]

to resolve successfully.

Requirements may also constrain one generic parameter while another remains specialized separately.

Example:

require Writable\[W\] \=

    io::write\_bytes\[W\];

\[Writable\[W\]\]

fn io::write\[V\](writer: \*mut W, value: \*V);

This declares a specialization-based function family.

The family is generic over V, but it is only valid for writer types W that satisfy Writable.

A specialization can then be written for a concrete value type:

fn io::write\[i32\](writer: \*mut W, value: \*i32)

{

    buf: \[10\]u8;

    parse.\[i32\](buf\[0..10\], value);

    return io::write\_bytes(writer, buf\[0..10\]);

}

Here, W is constrained by the family declaration.

The specialization provides behavior for V \= i32, while still requiring the writer type W to satisfy Writable.

Requirements do not introduce behavior, dispatch, inheritance, or method ownership.

They exist solely to describe which generic resolutions must be available for a particular instantiation.

## **7.6 Generic Resolution**

Generic resolution occurs after generic arguments have been determined.

For a universal generic function, the compiler:

1\. determines the concrete generic arguments

2\. instantiates the generic body

3\. validates the instantiated body

Example:

fn max\[T\](a: T, b: T) \-\> T

{

    return a \> b ? a : b;

}

a: u32;

b: u32;

max(a, b);

The compiler:

1\. infers T \= u32

2\. creates max\[u32\]

3\. validates the resulting body

If validation succeeds, compilation continues.

For a specialization-based function family, the compiler:

1\. determines the concrete generic arguments

2\. resolves the matching specialization

Example:

fn math::cmp\[T\](a: \*T, b: \*T) \-\> i32;

a: u32;

b: u32;

math::cmp(\&a, \&b);

The compiler resolves:

math::cmp\[u32\]

If no matching specialization exists, compilation fails.

Requirements participate in resolution.

Example:

require Comparable\[T\] \=

    math::cmp\[T\];

\[Comparable\[T\]\]

fn sort(data: \*T)

{

    ...

}

When sort\[Vec2\] is instantiated, the compiler must verify:

Comparable\[Vec2\]

which requires:

math::cmp\[Vec2\]

to resolve successfully.

If the required resolution fails, the instantiation is invalid.

Requirements are checked before the constrained declaration may be instantiated or resolved.

Requirement evaluation is purely structural.

A requirement is satisfied only if all referenced generic resolutions succeed.

Resolution never depends on:

● import order

● compilation order

● source file order

● visibility of unrelated modules

Given the same declarations and generic arguments, generic resolution always produces the same result.

## **7.7 Type Groups**

A type group defines a fixed set of concrete types.

Example:

types SignedIntegers \=

    i8 \+ i16 \+ i32 \+ i64 \+ isize;

Type groups allow a declaration to apply to multiple known types using a single implementation.

Example:

fn abs\[T for SignedIntegers\](x: T) \-\> T

{

    return x \< 0 ? \-x : x;

}

This is equivalent to defining:

fn abs(x: i8) \-\> i8 { ... }

fn abs(x: i16) \-\> i16 { ... }

fn abs(x: i32) \-\> i32 { ... }

fn abs(x: i64) \-\> i64 { ... }

fn abs(x: isize) \-\> isize { ... }

using one shared definition.

A type group is:

● a compile-time construct

● a closed set of types

● fully known during compilation

A type group does not:

● define behavior

● perform dispatch

● participate in specialization lookup

● introduce inheritance

Type groups may be composed.

Example:

types UnsignedIntegers \=

    u8 \+ u16 \+ u32 \+ u64 \+ usize;

types Integers \=

    SignedIntegers \+ UnsignedIntegers;

The body of a declaration using a type group must be valid for every member of the group.

Example:

type Weird \=

    i32 \+ \[\]u8;

fn test\[T for Weird\](x: T)

{

    x \+ 1;

}

This is invalid because:

\[\]u8 \+ 1

is not valid for all members of the group.

Unlike universal generic functions, validation occurs when the declaration is analyzed, not when a concrete instantiation is later requested.

Properties:

● type groups describe explicit sets of types

● group membership is fixed at compile time

● declarations are validated against all group members

● no additional types may satisfy a group

● type groups are a code-generation and validation mechanism, not a behavior mechanism

## **7.8 Specialization Ownership and Coherence**

Prism requires specialization resolution to be deterministic.

For any function family and concrete generic argument list, there must be exactly one valid specialization in the entire program.

Example:

fn math::cmp\[Vec2\](a: \*Vec2, b: \*Vec2) \-\> i32

{

    ...

}

fn math::cmp\[Vec2\](a: \*Vec2, b: \*Vec2) \-\> i32

{

    ...

}

This is always an error.

Prism does not allow:

● multiple competing implementations

● priority rules

● import-order selection

● best-match resolution

● fallback specialization lookup

Generic resolution is exact and deterministic.

Ownership Rules

A specialization may be defined only if the defining module owns:

● the function family, or

● at least one concrete type appearing in the specialization

Example:

fn math::cmp\[u32\](a: \*u32, b: \*u32) \-\> i32

{

    ...

}

This specialization may be defined by the module that owns math::cmp.

Primitive types are unowned and therefore cannot grant specialization ownership.

Example:

struct Vec2 {

    x: f32;

    y: f32;

}

fn math::cmp\[Vec2\](a: \*Vec2, b: \*Vec2) \-\> i32

{

    ...

}

This specialization may be defined either:

● by the module that owns math::cmp

● by the module that owns Vec2

A module that owns neither may not define the specialization.

Example:

// module graphics

struct Circle {

    radius: f32;

}

// module math

fn cmp\[T\](a: \*T, b: \*T) \-\> i32;

// module random

fn math::cmp\[Circle\](a: \*Circle, b: \*Circle) \-\> i32

{

    ...

}

This is invalid.

The random module owns neither Circle nor math::cmp.

**Why Ownership Exists**

Ownership prevents unrelated modules from injecting behavior into existing generic systems.

Without ownership restrictions, any module could provide competing implementations for arbitrary types and function families.

This would make generic resolution dependent on which modules happened to be present in a build.

Prism avoids this by requiring a clear ownership relationship between a specialization and the declarations it connects.

As a result:

● specialization ownership is local

● generic resolution remains deterministic

● behavior cannot be injected accidentally

● the meaning of a generic call is independent of import order

Optional Coherence Escape Hatch

Projects may optionally provide an explicit escape hatch.

Example:

@loose\_coherence

fn math::cmp\[ForeignType\](a: \*ForeignType, b: \*ForeignType) \-\> i32

{

    ...

}

This permits a specialization even when the defining module owns neither the function family nor the concrete type.

This feature is intentionally explicit because it introduces non-local behavior.

Even when loose coherence is used:

● specialization lookup remains exact

● ownership checks are bypassed only for that specialization

● uniqueness is still enforced

There may still be only one specialization for a given function family and concrete generic argument list.

**Summary**

For every specialization:

● exactly one implementation may exist

● lookup is exact

● ownership must come from the function family or a participating type

● primitive specializations belong to the function-family owner

● import order never affects resolution

These rules guarantee that generic behavior remains predictable, deterministic, and mechanically verifiable.

# 

# **8\. StdLib Philosophy**

Prism’s standard library is built around the same principle as the language itself:

*the machine model stays visible.*

The stdlib does not attempt to hide:

* allocation  
* ownership  
* transport  
* parsing  
* buffering  
* synchronization  
* platform behavior

behind universal abstractions.

Instead, each layer is separated explicitly.

The result is a stdlib that remains:

* composable  
* mechanically understandable  
* allocator-aware  
* operationally honest

while still providing ergonomic convenience where it does not compromise semantics.

The standard library intentionally rejects the idea that:

everything is "just a stream"

everything is "just an object"

everything is "just an interface"

because those abstractions usually erase important operational distinctions.

A file is not a socket.  
A socket is not stdin.  
A parser is not a reader.  
Formatting is not allocation.

Prism keeps these concepts separate.

*Types own structure. Modules own behavior.*

Types are passive layouts:

struct File

{

    handle: os::fd;

}

The type defines storage and representation.

Behavior belongs to modules:

file := fs::open("data.txt").\!;

NOT:

File.open(...)

This avoids:

* hidden namespace injection  
* behavior ownership confusion  
* implicit extension mechanisms

and keeps generic resolution deterministic.

The stdlib follows the same module-oriented architecture as the language itself.

Allocators are explicit everywhere.

Prism never silently chooses allocation policy.

If memory is required, the caller decides:

* where it comes from  
* how it grows  
* who owns it  
* when it is released

Example:

allocator := heap.page\_allocator();

buffer := vec::init\[u8\](allocator, 1024).\!;

The allocation policy is visible in the call itself.

The stdlib does not:

* secretly heap allocate  
* maintain hidden global allocators  
* implicitly resize structures  
* attach ownership to unrelated APIs

This is especially important for systems programming because allocation is not merely a convenience concern.

It affects:

* latency  
* fragmentation  
* synchronization  
* failure behavior  
* determinism

A parser should not secretly choose heap behavior.  
A formatting function should not silently allocate temporary strings.  
A file reader should not own memory policy.

Prism keeps those concerns separated.

Streams are concrete resources.

A stream is:

*a sequential byte-oriented resource.*

Examples:

* files  
* sockets  
* pipes  
* memory streams  
* stdin/stdout

Streams are not:

* protocol parsers  
* magical interface objects  
* ownership containers  
* universal runtime abstractions

Example:

file: File;

socket: TcpSocket;

stdin: Stdin;

stdout: Stdout;

stream: StringStream;

These are distinct resource types with different operational properties.

Capabilities are modeled explicitly.

Readable

Writable

Seekable

exist independently because real resources differ.

Example:

| Resource | Readable | Writable | Seekable |
| ----- | ----- | ----- | ----- |
| File | yes | yes | yes |
| Socket | yes | yes | no |
| Pipe | yes | yes | usually no |
| stdin | yes | no | no |
| stdout | no | yes | no |

The stdlib intentionally does not flatten these differences into:

one universal IO object

because that creates semantic lies.

Sockets are not seekable.  
stdout is not readable.

The type system reflects reality.

Capabilities are expressed through generic requirements:

\[Readable\[Reader\]\]

fn read(

    input: \*mut Reader,

    buffer: \[\]mut u8

) \-\> usize \!;

This means:

* Reader must satisfy Readable  
* the operation is generic over the resource type  
* no inheritance hierarchy exists  
* no virtual dispatch exists  
* no hidden interface objects exist

Similarly:

\[Writable\[Writer\]\]

fn write\_bytes(

    output: \*mut Writer,

    data: \[\]u8

) \-\> usize \!;

Writers are not abstract runtime entities.

They are:

* concrete resources  
* participating in generic capability requirements

This distinction is important.

A `File` may satisfy:

Readable \+ Writable \+ Seekable

while a `TcpSocket` may satisfy:

Readable \+ Writable

without pretending the two resources are semantically identical.

Files belong to filesystem modules:

use std.fs;

file := fs::open("log.txt").\!;

Possible operations:

fs::read(\&file, \&buffer).\!;

fs::write(\&file, data).\!;

fs::seek(\&file, .Begin, 0).\!;

The filesystem module owns filesystem behavior.

The file type itself remains structural.

Platform-specific details remain separated:

std::os::windows::fs

std::os::linux::fs

Portable abstractions exist independently:

std::fs

This preserves portability without pretending all platforms are identical.

stdin and stdout are ordinary concrete resources.

Example:

stdin: Stdin;

stdout: Stdout;

They participate in capabilities naturally:

\[Readable\[Stdin\]\]

\[Writable\[Stdout\]\]

There is no special parser magic attached to stdin.

stdin produces bytes.

Parsing happens separately.

Example:

buf: \[64\]u8;

count := stdin.read\_delims(\&buf, " \\n\\r\\t").\!;

age: u32 \= text.parse.\[u32\](buf\[0..count\]).\!;

This separation is fundamental.

Reading:

moves bytes

Parsing:

interprets bytes

Historically many languages fused these concepts together through APIs like:

* scanf  
* stream extraction operators  
* parser streams

which caused:

* hidden tokenization  
* synchronization bugs  
* overconsumption  
* allocation ambiguity  
* unclear failure behavior

Prism intentionally avoids this.

Delimiter extraction is the foundational primitive.

Fixed-buffer extraction:

buf: \[256\]u8;

count := stdin.read\_delim(\&buf, '\\n').\!;

or:

count := stdin.read\_delims(\&buf, " \\n\\r\\t").\!;

Properties:

* bounded  
* allocation-free  
* deterministic  
* stack-friendly

This is the real primitive operation.

Convenience functions lower into delimiter extraction:

stdin.read\_line(\&buf);

lowers into:

stdin.read\_delim(\&buf, '\\n');

Similarly:

stdin.stream\_line(\&stream);

lowers into:

stdin.stream\_delim(\&stream, '\\n');

The stdlib keeps the true primitive visible.

Dynamic extraction is explicit through writable destinations.

Example:

stream := stream\_str.init(allocator);

stdin.stream\_line(\&stream).\! ;

The destination owns memory behavior.

stdin does not:

* allocate  
* resize buffers  
* choose storage policy

This separation is extremely important.

The source moves bytes.  
The destination owns storage.

StringStream is a concrete memory-backed stream.

Example:

stream := stream\_str.init(allocator);

write\_bytes(\&stream, "hello").\!;

stream.seek(.Begin);

buf: \[16\]u8;

count := stream.read(\&buf).\!;

StringStream:

* stores bytes  
* owns memory  
* grows dynamically  
* supports reading/writing  
* may support seeking

It is not:

a magical Writer interface

It is a real resource with concrete operational behavior.

Formatting belongs to IO.

Formatting is:

*serialization of values into text.*

It is not:

* allocation  
* buffering  
* transport ownership

Formatting streams directly into writers.

Example:

stdout.printf("Age: {}", age);

socket.sendf("PING {}\\r\\n", id);

io.writef(\&file, "value \= {}\\n", x).\!;

Formatting belongs to:

io.writef(...)

because formatting and emission are fundamentally coupled operations.

The stdlib intentionally avoids:

format into hidden temporary string

then write

unless explicitly requested.

Formatting should be:

* direct  
* streaming  
* allocation-free where possible

The formatting system is compile-time analyzable.

Conceptually:

fn writef(

    output: \*mut Writer,

    comptime fmt: str,

    ...

)

The format string is verified statically.

This allows:

* placeholder validation  
* argument checking  
* direct lowering  
* zero-allocation formatting

without runtime parser overhead.

Parsing values belongs to text/parsing modules.

Example:

value: u32 \= text.parse.\[u32\](input).\!;

ratio: f64 \= text.parse.\[f64\](input).\!;

index: i64 \= text.parse.\[i64\](input).\!;

The target type is explicit.

Parsing fundamentally requires:

bytes \+ semantic target type

Prism does not pretend parsing can occur independently of the target representation.

Custom semantic types participate naturally.

Example:

use std.net.ipv4;

ip: IPv4Addr \= text.parse.\[IPv4Addr\](input).\!;

where the IPv4 module provides:

fn text.parse(ip: str) \-\> IPv4Addr

{

    ...

}

This preserves:

* module-owned behavior  
* deterministic lookup  
* passive types  
* explicit semantics

without requiring:

* methods on types  
* hidden parser registries  
* trait-object dispatch

General writing follows the same philosophy.

Example:

write\_val(\&stdout, \&value);

write\_val(\&file, \&packet);

write\_val(\&socket, \&message);

The writer capability is explicit:

\[Writable\[Writer\]\]

fn write\_val\[T\](

    w: \*mut Writer,

    val: \*T

) \!;

Concrete specializations define serialization behavior.

Example:

fn write\_val(

    w: \*mut Writer,

    val: \*IPv4Addr

)

{

    write\_val.\[u8\](w, \&val.\*.bytes\[0\]);

    write\_val.\[char\](w, &'.');

    write\_val.\[u8\](w, \&val.\*.bytes\[1\]);

    write\_val.\[char\](w, &'.');

    write\_val.\[u8\](w, \&val.\*.bytes\[2\]);

    write\_val.\[char\](w, &'.');

    write\_val.\[u8\](w, \&val.\*.bytes\[3\]);

}

The serialization logic belongs to the serialization function family, not the type itself.

This keeps:

* behavior explicit  
* specialization deterministic  
* ownership local  
* generic dispatch structural

Convenience APIs are allowed, but only when they lower into explicit primitives.

Prism does not reject ergonomics.

It rejects:

* hidden semantics  
* hidden allocation  
* semantic flattening  
* invisible ownership

The goal is:

easy things remain easy

complex things remain visible

A convenience API is acceptable if:

* its operational behavior is obvious  
* it lowers into explicit primitives  
* it does not hide ownership or synchronization

The stdlib architecture evolved toward strict ownership separation:

| Concern | Ownership |
| ----- | ----- |
| allocation | allocators |
| byte movement | IO |
| parsing | text/parser modules |
| formatting | io.writef |
| serialization | write\_val families |
| transport | stream/resources |
| platform behavior | OS modules |
| buffering | destination objects |
| capabilities | Readable/Writable/Seekable  |

This separation keeps the stdlib:

* explicit  
* deterministic  
* composable  
* systems-oriented

without collapsing into:

universal abstraction soup

which is the architectural trap many systems languages eventually fall into.

# **9 · Code Generation**

## **9.1 Overview**

Prism supports deterministic source generation through generator scripts.

Generators execute before semantic analysis and produce ordinary Prism source files whose names end with:

.gen.prism

Examples:

math.prism

math.gen.prism

serialization.prism

serialization.gen.prism

Generated files belong to the same module as every other source file in the directory.

Once generation completes, the compiler treats generated files exactly like handwritten source.

No distinction exists during semantic analysis, optimization, or code generation.

The purpose of generators is to eliminate repetitive boilerplate while keeping every compiled declaration visible as ordinary Prism code.

---

## **9.2 Compilation Pipeline**

Compilation proceeds in the following order:

1. Parse handwritten Prism source.  
2. Build the initial semantic model.  
3. Execute generators.  
4. Produce `.gen.prism` files.  
5. Parse generated source.  
6. Perform full semantic analysis.  
7. Generate machine code.

Generators never modify existing source files.

Their only output is additional Prism source.

---

## **9.3 Generator API**

Generators execute inside a dedicated scripting environment provided by the compiler.

The reference compiler uses Lua as its scripting language.

Lua is **not** part of the Prism language specification.

A different compiler may use another implementation as long as it exposes the same observable API.

Generators communicate with the compiler exclusively through the Semantic API.

The Semantic API provides read-only access to compiler information, including:

* modules  
* declarations  
* functions  
* types  
* generic parameters  
* effects  
* attributes  
* source locations  
* compiler utilities  
* project metadata

The API exposes semantic information rather than syntax whenever possible.

For example, a generator may enumerate every struct in a module without parsing source text itself.

---

## **9.4 Emission API**

Generators do not construct syntax trees directly.

Instead, they emit Prism source using a structured emission API.

The API provides facilities such as:

* creating files  
* writing declarations  
* formatting source  
* emitting documentation  
* preserving deterministic ordering

The generated output is ordinary Prism source code following the standard formatting conventions.

Because generators emit source instead of compiler IR or AST nodes:

* generated code can be inspected  
* generated code can be debugged  
* generated code can be edited if desired  
* tooling treats generated code identically to handwritten code

---

## **9.5 Project Access**

Generators may inspect any part of the current project.

This includes:

* all modules  
* all generated files from previous generation stages  
* project configuration  
* imported packages  
* additional project resources

Generators may also read arbitrary project files through the compiler's file API.

Access outside the project directory is implementation-defined and may be restricted by the build system.

Generators cannot modify handwritten Prism files.

They may only create or overwrite generated source files.

---

## **9.6 Determinism**

Generators are expected to be deterministic.

Given identical project inputs, identical generator scripts, and identical compiler configuration, generation must produce identical `.gen.prism` output.

The compiler may cache generation results based on these inputs.

Generator scripts are not Prism source files. They are project tooling located under `/gen`. Only files in `/gen` are executed as generators. Generated Prism source is never interpreted as a generator.

Generators should not depend on external state such as:

* current time  
* random number generation  
* network resources

unless explicitly permitted by the build configuration.

---

## **9.7 Design Intent**

Prism intentionally separates code generation from the language itself.

The language contains no compile-time AST rewriting, declaration synthesis, or macro system.

Instead, generation is performed by external scripts using the compiler's Semantic API.

This approach keeps the language itself small while still allowing powerful automation.

Most importantly, every declaration that reaches semantic analysis exists as ordinary Prism source.

There are no hidden declarations, invisible compiler-generated symbols, or special language constructs.

Generated code is simply Prism code.

